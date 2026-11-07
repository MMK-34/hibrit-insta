// Ortak yardımcılar: zaman aşımlı fetch, yeniden deneme, son-sağlam-veri koruma, slug.
import fs from "node:fs";
import path from "node:path";

export const UA = "serbesttempo-sync/1.0 (+https://serbesttempo.com/hakkinda/; mailto:mmehmetkuyucu@gmail.com)";

export async function fetchJson(url, { timeout = 20000, retries = 2, headers = {} } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json,text/html;q=0.8,*/*;q=0.5", ...headers }, signal: ctl.signal });
      clearTimeout(t);
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) return { ok: false, status: r.status, body: null };
      const ct = r.headers.get("content-type") ?? "";
      const body = ct.includes("json") ? await r.json() : await r.text();
      return { ok: true, status: r.status, body };
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      await sleep(1500 * (i + 1));
    }
  }
  return { ok: false, status: 0, body: null, error: String(lastErr) };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function slugify(s) {
  return String(s).toLowerCase()
    .replace(/ş/g, "s").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

/** Yeni veri boş/az ise eski veriyi koru; aksi hâlde yaz. Değişiklik olup olmadığını döner. */
export function writeIfBetter(file, next, { minItems = 1, listKey = "items" } = {}) {
  const prev = readJson(file, null);
  const nextList = next[listKey] ?? [];
  if (nextList.length < minItems && prev && (prev[listKey] ?? []).length >= minItems) {
    console.warn(`[keep] ${path.basename(file)}: yeni veri yetersiz (${nextList.length}), son sağlam veri korunuyor.`);
    return false;
  }
  const a = JSON.stringify({ ...prev, updated: undefined }), b = JSON.stringify({ ...next, updated: undefined });
  if (a === b) { console.log(`[same] ${path.basename(file)}: değişiklik yok.`); return false; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
  console.log(`[write] ${path.basename(file)}: ${nextList.length} kayıt.`);
  return true;
}

/** HTML içinden JSON-LD bloklarını çıkar */
export function jsonLdFrom(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) { try { const j = JSON.parse(m[1].trim()); out.push(...(Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j])); } catch {} }
  return out;
}

export function isoDate(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}
