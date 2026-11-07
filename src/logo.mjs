// Etkinlik/organizatör logosunu RESMÎ siteden bulur (JSON-LD logo, apple-touch-icon, "logo" geçen img/og:image).
// Bulunamazsa null döner; post logosuz devam eder. Haberde etkinliği tanıtmak için kullanılır.
import sharp from "sharp";

const UA = "Mozilla/5.0 (compatible; hibrit-portal-news/1.0)";

import dns from "node:dns/promises";
import net from "node:net";

// SSRF koruması: yalnızca https, herkese açık IP; yönlendirmeler elle izlenir ve her adım denetlenir; boyut sınırı 3 MB
function privateIp(ip) {
  if (net.isIPv6(ip)) return /^(::1|fc|fd|fe80|::ffff:(10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\.)/i.test(ip) || ip === "::";
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function safeUrl(u) {
  let url;
  try { url = new URL(u); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
  try {
    const addrs = await dns.lookup(url.hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
  } catch { return false; }
}

async function get(url, asBuffer = false) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    let cur = url;
    for (let hop = 0; hop < 4; hop++) {
      if (!(await safeUrl(cur))) return null;
      const r = await fetch(cur, { headers: { "user-agent": UA }, signal: ctl.signal, redirect: "manual" });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { cur = new URL(r.headers.get("location"), cur).href; continue; }
      if (!r.ok) return null;
      if (Number(r.headers.get("content-length") ?? 0) > 3e6) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 3e6) return null;
      return asBuffer ? buf : buf.toString("utf8");
    }
    return null;
  } catch { return null; } finally { clearTimeout(t); }
}

function candidates(html, base) {
  const out = [];
  const abs = (u) => { try { return new URL(u.replace(/&amp;/g, "&"), base).href; } catch { return null; } };
  // JSON-LD "logo"
  for (const m of html.matchAll(/"logo"\s*:\s*(?:"([^"]+)"|\{[^}]*?"url"\s*:\s*"([^"]+)")/g)) out.push(abs(m[1] || m[2]));
  // <img ... logo ...>
  for (const m of html.matchAll(/<img[^>]+>/gi)) {
    const tag = m[0];
    if (!/logo/i.test(tag)) continue;
    const src = (tag.match(/\s(?:src|data-src)=["']([^"']+)["']/i) ?? [])[1];
    if (src && !/^data:/.test(src)) out.push(abs(src));
  }
  // og:image yalnızca adında logo geçiyorsa
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) if (/logo/i.test(m[1])) out.push(abs(m[1]));
  // apple-touch-icon (genelde 180px, kare logo)
  for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi)) {
    const href = (m[0].match(/href=["']([^"']+)["']/i) ?? [])[1];
    if (href) out.push(abs(href));
  }
  return [...new Set(out.filter(Boolean))];
}

/** Döner: { buf (PNG, yükseklik 120px), source } ya da null */
export async function fetchEventLogo(officialSite) {
  if (!/^https:\/\//i.test(officialSite ?? "")) return null;
  const html = (await get(officialSite)) ?? "";
  const host = new URL(officialSite).hostname;
  // Yedek: sitenin büyük ikonu (JS ile çizilen sitelerde HTML'de logo olmayabilir). 128px altı = varsayılan ikon, kullanılmaz.
  const list = [...candidates(html, officialSite).slice(0, 6), `https://www.google.com/s2/favicons?domain=${host}&sz=256`];
  for (const url of list) {
    const raw = await get(url, true);
    if (!raw || raw.length < 300) continue;
    try {
      const img = sharp(raw, { density: 300 });
      const meta = await img.metadata();
      const minW = url.includes("s2/favicons") ? 128 : 64;
      if (!meta.width || meta.width < minW || meta.height < 32) continue;
      const buf = await sharp(raw, { density: 300 }).trim().resize({ height: 120, width: 420, fit: "inside" }).png().toBuffer();
      return { buf, source: url };
    } catch { /* desteklenmeyen biçim: sıradakini dene */ }
  }
  return null;
}

/**
 * Organizatörün Instagram profil fotoğrafı (Business Discovery API). Meta app'te "Instagram Public Content"
 * / business discovery izni yoksa hata döner; o durumda null (post logosuz ya da site logosuyla devam eder).
 */
export async function fetchInstagramLogo(username) {
  const u = String(username ?? "").replace(/^@/, "").trim();
  if (!/^[\w.]{2,30}$/.test(u)) return null;
  const t = process.env.IG_ACCESS_TOKEN, id = process.env.IG_USER_ID;
  if (!t || !id) return null;
  const host = t.startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com";
  const j = await fetch(`https://${host}/v23.0/${id}?fields=${encodeURIComponent(`business_discovery.username(${u}){profile_picture_url}`)}&access_token=${t}`)
    .then((r) => r.json()).catch(() => null);
  const pic = j?.business_discovery?.profile_picture_url;
  if (!pic) return null;
  const raw = await get(pic, true);
  if (!raw) return null;
  // Profil fotoğrafı kare: yuvarlak maske ile 120px
  const size = 120;
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
  const buf = await sharp(raw).resize(size, size).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return { buf, source: `instagram:@${u}` };
}
