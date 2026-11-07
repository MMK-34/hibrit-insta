// Konuya uygun, ticari kullanımı serbest fotoğraf bulma.
// Sıra: Pexels (PEXELS_API_KEY varsa) -> Openverse (anahtarsız, CC lisanslı) -> yerel kütüphane.
// Haber sitelerinin fotoğrafları KULLANILMAZ (telif).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = path.resolve(ROOT, "..", "public", "img");
const UA = "Mozilla/5.0 (compatible; hibrit-portal-news/1.0)";

const LOCAL_BY_CAT = {
  hyrox: ["hyrox-sled", "hyrox-sled-2", "rower", "chalk-hands"],
  crossfit: ["comp-overhead", "comp-lift", "comp-women", "rope-climb", "box-jumps", "barbell-floor", "comp-pullups-tr"],
  kosu: ["hero-alt", "rower"],
  fonksiyonel: ["box-jumps", "chalk-hands", "barbell-floor", "hero-gym"],
  genel: ["hero-gym", "hero-alt", "comp-overhead"],
};

async function getJson(url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, ...headers } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function pexels(q, n) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const j = await getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=portrait&per_page=${Math.max(n * 3, 10)}`, { authorization: key });
  return (j?.photos ?? []).map((p) => ({ id: `pexels:${p.id}`, url: p.src.large2x, credit: `Foto: ${p.photographer} / Pexels` }));
}

async function openverse(q, n) {
  const j = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license_type=commercial,modification&size=large&page_size=${Math.max(n * 3, 10)}&mature=false`);
  return (j?.results ?? []).filter((r) => r.url && (r.width ?? 0) >= 900).map((r) => ({
    id: `ov:${r.id}`, url: r.url,
    credit: `Foto: ${(r.creator || "bilinmiyor").slice(0, 40)} / ${String(r.license).toUpperCase()} ${r.license_version ?? ""}`.trim(),
  }));
}

async function download(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA } });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length > 20000 ? b : null;
  } catch { return null; }
}

/**
 * queries: İngilizce arama ifadeleri (en spesifikten genele). n: gereken foto sayısı.
 * usedIds: daha önce kullanılan foto id'leri (tekrarı önler). Döner: [{ id, buf, credit }]
 */
export async function findImages(queries, n, category, usedIds = new Set()) {
  const out = [];
  const take = async (cands) => {
    for (const c of cands) {
      if (out.length >= n) return;
      if (usedIds.has(c.id) || out.some((o) => o.id === c.id)) continue;
      const buf = await download(c.url);
      if (buf) out.push({ ...c, buf });
    }
  };
  for (const q of queries) { if (out.length < n) await take(await pexels(q, n)); }
  for (const q of queries) { if (out.length < n) await take(await openverse(q, n)); }
  // Yerel yedek: kategoriye uygun kütüphane fotoğrafları (tekrar edebilir)
  const locals = LOCAL_BY_CAT[category] ?? LOCAL_BY_CAT.genel;
  for (let i = 0; out.length < n && i < locals.length * 2; i++) {
    const f = path.join(LOCAL, `${locals[i % locals.length]}.webp`);
    if (fs.existsSync(f)) out.push({ id: `local:${locals[i % locals.length]}:${i}`, buf: fs.readFileSync(f), credit: "Foto: Pexels" });
  }
  return out;
}
