// RSS/Atom toplama + makale metni çekme (yalnızca özetlemek için; yayına kopyalanmaz).
import { safeGet, urlAllowed } from "./safe-net.mjs";
import { XMLParser } from "fast-xml-parser";
import { FEEDS, POSTING } from "./config.mjs";

const UA = "Mozilla/5.0 (compatible; hibrit-portal-news/1.0)";
const MAX_BYTES = 2e6; // gövde üst sınırı ~2 MB
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
const txt = (v) => (v == null ? "" : typeof v === "object" ? (v["#text"] ?? v["@href"] ?? "") : String(v));
const clean = (s = "") => String(s).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "'").replace(/&#8220;|&#8221;|&quot;/g, '"').replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();

// SSRF koruması: safe-net.mjs (bağlantı anında IP denetimi, her yönlendirme adımı denetlenir, gövde ~2 MB ile sınırlı)
async function get(url, timeout = 15000) {
  const r = await safeGet(url, { timeout, maxBytes: MAX_BYTES, headers: { "user-agent": UA, accept: "*/*" } });
  return r?.ok ? r.buf.toString("utf8") : null;
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
/**
 * Google News RSS bağlantısını (news.google.com/rss/articles/...) yayıncının asıl adresine çözer.
 * Bu bağlantılar JS ile yönlendirir: düz fetch sayfa metni vermez, doğrulayıcı da açamaz (url_too_long).
 * Yöntem: makale sayfasındaki imza (data-n-a-sg) ve zaman damgası (data-n-a-ts) ile Google'ın batchexecute ucu.
 * Yalnızca sabit news.google.com adresine istek atılır. Hata ya da beklenmeyen yanıtta özgün URL döner.
 */
export async function resolveNewsUrl(url) {
  const m = String(url ?? "").match(/^https:\/\/news\.google\.com\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)/);
  if (!m) return url;
  const id = m[1];
  const headers = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "accept-language": "tr-TR,tr;q=0.9" };
  try {
    const page = await fetch(`https://news.google.com/rss/articles/${id}`, { headers, signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.text() : ""));
    const sg = page.match(/data-n-a-sg="([^"]+)"/)?.[1], ts = page.match(/data-n-a-ts="(\d+)"/)?.[1];
    if (!sg || !ts) return url;
    const req = [[["Fbv4je", JSON.stringify(["garturlreq", [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]), null, "generic"]]];
    const r = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST", headers: { ...headers, "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: `f.req=${encodeURIComponent(JSON.stringify(req))}`, signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return url;
    const t = await r.text();
    const j = JSON.parse(t.slice(t.indexOf("\n\n") + 2));
    const out = JSON.parse(j?.[0]?.[2] ?? "null")?.[1];
    // Yalnızca geçerli, herkese açık https adresi kabul edilir
    if (typeof out === "string" && /^https:\/\//.test(out) && URL.canParse(out) && urlAllowed(out, { allowHttp: false }) && !/news\.google\.com/.test(out)) return out;
  } catch { /* çözülemedi: özgün URL */ }
  return url;
}

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
