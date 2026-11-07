// RSS/Atom toplama + makale metni çekme (yalnızca özetlemek için; yayına kopyalanmaz).
import dns from "node:dns/promises";
import net from "node:net";
import { XMLParser } from "fast-xml-parser";
import { FEEDS, POSTING } from "./config.mjs";

const UA = "Mozilla/5.0 (compatible; hibrit-portal-news/1.0)";
const MAX_BYTES = 2e6; // gövde üst sınırı ~2 MB
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
const txt = (v) => (v == null ? "" : typeof v === "object" ? (v["#text"] ?? v["@href"] ?? "") : String(v));
const clean = (s = "") => String(s).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "'").replace(/&#8220;|&#8221;|&quot;/g, '"').replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();

// SSRF koruması (logo.mjs safeUrl ile aynı mantık): http/https, kimlik bilgisiz URL, yalnızca herkese açık IP.
// Yönlendirmeler elle izlenir ve her adım yeniden denetlenir.
function privateIp(ip) {
  if (net.isIPv6(ip)) {
    const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (m) return privateIp(m[1]);
    return /^(::1$|::$|fc|fd|fe[89ab])/i.test(ip);
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function safeUrl(u) {
  let url;
  try { url = new URL(u); } catch { return false; }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return false;
  if (url.port && !["80", "443"].includes(url.port)) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  try {
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
  } catch { return false; }
}

/** Gövdeyi en fazla max bayta kadar okur (fazlası kesilir). */
async function readCapped(r, max) {
  if (!r.body) return "";
  const reader = r.body.getReader();
  const chunks = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    n += value.length;
    if (n >= max) { await reader.cancel().catch(() => {}); break; }
  }
  return Buffer.concat(chunks).subarray(0, max).toString("utf8");
}

async function get(url, timeout = 15000) {
  try {
    const signal = AbortSignal.timeout(timeout);
    let cur = url;
    for (let hop = 0; hop < 6; hop++) {
      if (!(await safeUrl(cur))) return null;
      const r = await fetch(cur, { headers: { "user-agent": UA, accept: "*/*" }, signal, redirect: "manual" });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        await r.body?.cancel().catch(() => {});
        if (!loc) return null;
        cur = new URL(loc, cur).href;
        continue;
      }
      if (!r.ok) { await r.body?.cancel().catch(() => {}); return null; }
      if (Number(r.headers.get("content-length") ?? 0) > MAX_BYTES * 5) { await r.body?.cancel().catch(() => {}); return null; }
      return await readCapped(r, MAX_BYTES);
    }
    return null;
  } catch { return null; }
}

export async function collect() {
  const now = Date.now();
  const out = [];
  const report = {};
  await Promise.all(FEEDS.map(async (f) => {
    const xml = await get(f.url);
    if (!xml) { report[f.url] = "HATA"; return; }
    let doc;
    try { doc = parser.parse(xml); } catch { report[f.url] = "PARSE"; return; }
    const items = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
    let n = 0;
    for (const it of [].concat(items).slice(0, 25)) {
      const title = clean(txt(it.title));
      let link = txt(it.link);
      if (Array.isArray(it.link)) link = txt(it.link.find((l) => l["@rel"] !== "self") ?? it.link[0]);
      const date = new Date(txt(it.pubDate) || txt(it.published) || txt(it.updated) || now);
      if (!title || !link || isNaN(date)) continue;
      const ageH = (now - date.getTime()) / 36e5;
      if (ageH > POSTING.maxAgeHours) continue;
      // Google News başlıkları "Başlık - Yayın" biçiminde
      const src = it.source ? clean(txt(it.source)) : f.source;
      const t = f.source === "Google News" ? title.replace(/\s+-\s+[^-]+$/, "") : title;
      out.push({
        id: link.replace(/[?#].*$/, ""),
        title: t, url: link, source: src, feedCat: f.cat,
        date: date.toISOString(), ageH: Math.round(ageH),
        snippet: clean(txt(it.description) || txt(it.summary)).slice(0, 400),
      });
      n++;
    }
    report[f.url] = n;
  }));
  // Aynı başlığı farklı kaynaklardan tekilleştir
  const seen = new Set();
  const uniq = out.filter((x) => {
    const k = x.title.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, "").slice(0, 60);
    if (seen.has(k) || seen.has(x.id)) return false;
    seen.add(k); seen.add(x.id); return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
  return { items: uniq, report };
}

/** Seçilen haberin makale metni (özet doğruluğu için). Google News linkleri yönlendirmeli; olmazsa snippet kullanılır. */
export async function articleText(url) {
  const page = await get(url, 20000);
  if (!page) return "";
  const body = page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, " ");
  const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => clean(m[1])).filter((p) => p.length > 60);
  return paras.join("\n").slice(0, 6000);
}

/**
 * Yarış takvimi (portalın calendar.json'u): yaklaşan yarışlar duyuru adayı olur.
 * Türkiye'deki yarışlar 30 gün, diğerleri 10 gün önceden aday. Kaynak: CALENDAR_URL ya da ../src/data/calendar.json
 */
export async function upcomingEvents() {
  let data = null;
  if (process.env.CALENDAR_URL) {
    try { const r = await fetch(process.env.CALENDAR_URL, { signal: AbortSignal.timeout(20000) }); if (r.ok) data = await r.json(); } catch {}
  }
  if (!data) {
    try {
      const fs = await import("node:fs");
      for (const rel of ["../cal/src/data/calendar.json", "../../src/data/calendar.json"]) {
        const u = new URL(rel, import.meta.url);
        if (fs.existsSync(u)) { data = JSON.parse(fs.readFileSync(u, "utf8")); break; }
      }
      if (!data) return [];
    } catch { return []; }
  }
  const now = Date.now();
  return (data.items ?? []).filter((e) => {
    const d = (new Date(e.startDate).getTime() - now) / 864e5;
    const tr = /t[uü]rk/i.test(e.country ?? "");
    return d >= 0 && d <= (tr ? 30 : 10);
  }).map((e) => ({
    id: `cal:${e.id}`,
    eventName: e.name ?? "", // tekrar kontrolü için (run.mjs: takip serisi / son paylaşımlar)
    title: `Yaklaşan yarış: ${e.name} (${e.city}, ${e.country}) ${e.startDate}${e.endDate && e.endDate !== e.startDate ? ` – ${e.endDate}` : ""}`,
    url: e.url || e.sourceUrl || "", source: "Yarış takvimi", feedCat: e.type === "hyrox" ? "hyrox" : e.type === "crossfit" ? "crossfit" : "genel",
    date: new Date().toISOString(), ageH: 0,
    snippet: `Etkinlik: ${e.name}. Şehir: ${e.city}, ${e.country}. Tarih: ${e.startDate}${e.endDate ? ` - ${e.endDate}` : ""}. Durum: ${e.status ?? "?"}. Kayıt/bilgi: ${e.url || e.sourceUrl || "-"}`,
    text: "",
  }));
}
