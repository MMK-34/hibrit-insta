// Konuya uygun, ticari kullanımı serbest fotoğraf bulma.
// Sıra: Pexels (PEXELS_API_KEY varsa) -> Openverse (anahtarsız, CC lisanslı) -> yerel kütüphane.
// Haber sitelerinin fotoğrafları KULLANILMAZ (telif).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Yerel yedek fotoğraflar repo içinde (Actions'ta yalnızca insta reposu klonlanır; ../public/img orada yok)
const LOCAL = path.join(ROOT, "assets", "img");
const UA = "Mozilla/5.0 (compatible; hibrit-portal-news/1.0)";

// Yerel kütüphane fotoğraflarının açıklamaları (doğrulayıcı konu uyumunu bu metinle değerlendirir)
const LOCAL_ALT = {
  "hero-gym": "Fonksiyonel antrenman salonunda ağırlık ve ekipmanlar",
  "hero-alt": "Karanlık bir antrenman salonunda halter barı ve ekipmanlar",
  "comp-women": "CrossFit yarışmasında mücadele eden kadın sporcular",
  "comp-overhead": "CrossFit yarışmasında başüstü ağırlık kaldıran sporcu",
  "comp-pullups-tr": "Türkiye'de bir CrossFit yarışmasında barfiks çeken sporcular",
  "comp-lift": "Yarışmada halter barı kaldıran sporcu",
  "hyrox-sled": "Antrenman salonunda sled (kızak) iten sporcu",
  "hyrox-sled-2": "Stadyum ortamında sled iten sporcu",
  "chalk-hands": "Ağırlık öncesi ellerine magnezyum süren sporcu",
  "barbell-floor": "Yerde duran halter barı ve plakalar",
  "box-jumps": "Kutu üzerine sıçrayan sporcu (box jump)",
  "rope-climb": "Halata tırmanan sporcu (rope climb)",
  "rower": "Kürek ergometresinde (rowing) antrenman yapan sporcu",
  "athlete-rest": "Antrenman arasında dinlenen sporcu",
  "barbell-mist": "Sisli salonda halter barı",
  "comp-barbell": "Yarışmada halter barıyla hareket yapan sporcu",
  "comp-crowd": "Seyircili bir fonksiyonel fitness yarışması",
  "comp-field": "Açık alanda kurulmuş yarışma parkuru",
  "comp-judge": "Yarışmada hakem gözetiminde tekrar yapan sporcu",
  "comp-night-tr": "Türkiye'de akşam saatlerinde yapılan bir CrossFit yarışması",
  "comp-rings": "Yarışmada halkalarda hareket yapan sporcu",
  "comp-win": "Yarışma sonrası sevinen sporcu",
  "gym-flags": "Bayraklarla süslenmiş bir antrenman salonu",
  "gym-industrial": "Endüstriyel tarzda fonksiyonel antrenman salonu",
  "kb-floor": "Zeminde sıralı kettlebell'ler",
  "kb-rack": "Rafta duran kettlebell'ler",
  "medball-rack": "Rafta duran sağlık topları (wall ball)",
  "overhead-woman": "Başüstü ağırlık kaldıran kadın sporcu",
  "rings-gym": "Salonda asılı jimnastik halkaları",
  "ropes": "Antrenman salonunda battle rope halatları",
  "run-finish": "Koşu yarışında bitiş çizgisi",
  "run-marathon": "Şehir maratonunda koşan sporcular",
  "run-start": "Koşu yarışının başlangıcı",
  "run-track": "Atletizm pistinde koşan sporcu",
  "silhouette": "Gün batımında koşan sporcunun silueti",
  "sled-stadium": "Stadyumda sled iten sporcu",
  "sled-water": "Yağmurlu zeminde sled iten sporcu",
};

const LOCAL_BY_CAT = {
  hyrox: ["hyrox-sled", "hyrox-sled-2", "sled-stadium", "sled-water", "rower", "medball-rack", "kb-rack", "run-start", "chalk-hands"],
  crossfit: ["comp-overhead", "comp-lift", "comp-women", "comp-barbell", "comp-crowd", "comp-judge", "comp-rings", "comp-win", "comp-night-tr", "comp-pullups-tr", "rope-climb", "box-jumps", "barbell-floor", "overhead-woman"],
  kosu: ["run-marathon", "run-start", "run-finish", "run-track", "silhouette", "hero-alt"],
  fonksiyonel: ["kb-floor", "kb-rack", "medball-rack", "ropes", "rings-gym", "box-jumps", "chalk-hands", "barbell-mist", "gym-industrial", "athlete-rest"],
  genel: ["comp-field", "comp-crowd", "gym-flags", "hero-gym", "run-marathon", "comp-win", "barbell-floor"],
};

async function getJson(url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, ...headers }, signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function pexels(q, n) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const j = await getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=portrait&per_page=${Math.max(n * 3, 10)}`, { authorization: key });
  return (j?.photos ?? []).map((p) => ({ id: `pexels:${p.id}`, url: p.src.large2x, credit: `Foto: ${p.photographer} / Pexels`, alt: p.alt ?? "", license: "Pexels lisansı" }));
}

async function openverse(q, n) {
  const j = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license_type=commercial,modification&size=large&page_size=${Math.max(n * 3, 10)}&mature=false`);
  const BLOCK = /rawpixel|department of defense|u\.s\. army|army|navy|air force|marine|military|wheelchair|paralymp/i;
  return (j?.results ?? []).filter((r) => r.url && (r.width ?? 0) >= 900 && !BLOCK.test(`${r.creator} ${r.title} ${r.source} ${r.provider} ${r.url}`)).map((r) => ({
    id: `ov:${r.id}`, url: r.url, alt: r.title ?? "", license: `${String(r.license).toUpperCase()} ${r.license_version ?? ""}`.trim(),
    credit: `Foto: ${(r.creator || "bilinmiyor").slice(0, 40)} / ${String(r.license).toUpperCase()} ${r.license_version ?? ""}`.trim(),
  }));
}

async function download(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
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
  // Yerel kütüphane (seçilmiş, konuyla ilgili Pexels fotoğrafları) Openverse'ten önce gelir: Openverse kalitesi değişken
  // Karışık sıra: aynı kategoride postlar hep aynı fotoğrafla açılmasın
  // Yerel kütüphanesi olmayan branşlarda (yüzme, güreş, bisiklet vb.) alakasız salon fotoğrafı konmaz
  const hasLocal = Object.hasOwn(LOCAL_BY_CAT, category ?? "genel");
  const locals = hasLocal ? [...LOCAL_BY_CAT[category ?? "genel"]].sort(() => Math.random() - 0.5) : [];
  const usedLocal = new Set(out.map((o) => o.id));
  for (let i = 0; out.length < n && i < locals.length; i++) {
    const f = path.join(LOCAL, `${locals[i]}.webp`);
    if (fs.existsSync(f) && !usedLocal.has(`local:${locals[i]}`)) out.push({ id: `local:${locals[i]}`, buf: fs.readFileSync(f), credit: "Foto: Pexels", alt: LOCAL_ALT[locals[i]] ?? locals[i], license: "Pexels lisansı" });
  }
  // Son çare: Openverse (filigranlı/ilgisiz kaynaklar elenir)
  for (const q of queries) { if (out.length < (hasLocal ? Math.min(n, 1) : n)) await take(await openverse(q, n)); }
  return out;
}
