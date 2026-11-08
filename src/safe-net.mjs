// SSRF koruması (dış kaynaklı URL'ler: RSS, haber sayfaları, logo): kontrol BAĞLANTI ANINDA yapılır.
// undici Agent'ın connect.lookup kancası her bağlantıda DNS'i çözer ve yalnızca herkese açık bir adrese bağlanır,
// böylece "kontrol ettiğim IP ≠ bağlandığım IP" (DNS rebinding / TOCTOU) açığı kapanır.
// Adres sınıflandırması net.BlockList ile yapılır (IPv4, IPv6 ve IPv4'e eşlenmiş IPv6 biçimleri dahil).
import dns from "node:dns";
import net from "node:net";
// fetch da undici paketinden: Node 22 yerleşik fetch (undici 6) undici 8 Agent ile uyumsuz, tüm istekler düşüyordu
import { Agent, fetch } from "undici";

const BLOCK = new net.BlockList();
for (const [a, p] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
]) BLOCK.addSubnet(a, p, "ipv4");
for (const [a, p] of [
  ["::", 128], ["::1", 128], ["::", 96] /* IPv4-compatible */, ["64:ff9b::", 96] /* NAT64 */, ["100::", 64],
  ["2001:db8::", 32], ["2002::", 16] /* 6to4 */, ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
]) BLOCK.addSubnet(a, p, "ipv6");

/** IPv4'e eşlenmiş IPv6'yı (::ffff:a.b.c.d ve ::ffff:XXXX:XXXX) IPv4'e çevirip ikisini de denetler. */
export function isBlockedIp(ip) {
  const fam = net.isIPv6(ip) ? "ipv6" : net.isIPv4(ip) ? "ipv4" : null;
  if (!fam) return true;
  if (BLOCK.check(ip, fam)) return true;
  if (fam === "ipv6") {
    const low = ip.toLowerCase();
    const dotted = low.match(/^(?:0*:)*:?ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isBlockedIp(dotted[1]);
    const hex = low.match(/^(?:0*:)*:?ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const h = parseInt(hex[1], 16), l = parseInt(hex[2], 16);
      return isBlockedIp(`${h >> 8}.${h & 255}.${l >> 8}.${l & 255}`);
    }
  }
  return false;
}

// Bağlantı anında çözümleme: engelli adreslere asla bağlanılmaz
function safeLookup(hostname, options, cb) {
  dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
    if (err) return cb(err);
    const ok = (addrs ?? []).filter((a) => !isBlockedIp(a.address));
    if (!ok.length) return cb(Object.assign(new Error(`engelli adres: ${hostname}`), { code: "EBLOCKED" }));
    if (options?.all) return cb(null, ok);
    cb(null, ok[0].address, ok[0].family);
  });
}

export const SAFE_AGENT = new Agent({ connect: { lookup: safeLookup }, maxRedirections: 0 });

/** URL biçim kontrolü: http/https (allowHttp), varsayılan port, kimlik bilgisi yok, IP literal ise herkese açık olmalı. */
export function urlAllowed(u, { allowHttp = true } = {}) {
  let url;
  try { url = new URL(u); } catch { return false; }
  if (!(url.protocol === "https:" || (allowHttp && url.protocol === "http:"))) return false;
  if (url.username || url.password) return false;
  if (url.port && !["80", "443"].includes(url.port)) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedIp(host)) return false;
  return true;
}

/**
 * Güvenli GET: her yönlendirme adımı denetlenir (en fazla 6), bağlantı SAFE_AGENT ile kurulur, gövde maxBytes ile sınırlanır.
 * Döner: { ok, status, buf } ya da null.
 */
export async function safeGet(url, { timeout = 15000, maxBytes = 2e6, headers = {}, allowHttp = true } = {}) {
  const signal = AbortSignal.timeout(timeout);
  let cur = url;
  try {
    for (let hop = 0; hop < 6; hop++) {
      if (!urlAllowed(cur, { allowHttp })) return null;
      const r = await fetch(cur, { headers, signal, redirect: "manual", dispatcher: SAFE_AGENT });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { cur = new URL(r.headers.get("location"), cur).href; continue; }
      if (Number(r.headers.get("content-length") ?? 0) > maxBytes * 5) return null;
      const chunks = []; let size = 0;
      for await (const c of r.body ?? []) { size += c.length; if (size > maxBytes) break; chunks.push(c); }
      return { ok: r.ok, status: r.status, buf: Buffer.concat(chunks), finalUrl: cur };
    }
    return null;
  } catch { return null; }
}
