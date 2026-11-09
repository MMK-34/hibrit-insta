// Konuya uygun, ticari kullanımı serbest fotoğraf bulma.
// Sıra: Pexels (PEXELS_API_KEY varsa) -> Openverse (anahtarsız, CC lisanslı) -> yerel kütüphane.
// Haber sitelerinin fotoğrafları KULLANILMAZ (telif).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { safeGet } from "./safe-net.mjs";

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
  "su-swim-race": "Kapalı havuzda serbest stil yarışında kulaç atan yüzücüler",
  "su-swim-back": "Havuzda sırtüstü yarışında yüzen sporcular",
  "su-rowing": "Gölde kürek çeken bir takım teknesi",
  "su-kayak": "Durgun bir gölde kano ve kayak süren sporcular",
  "dovus-wrestling": "Kapalı salonda güreş müsabakası, minderde iki güreşçi",
  "dovus-wrestling-2": "Güreş müsabakasında minderde mücadele eden iki sporcu",
  "dovus-boxing-gym": "Boş bir boks ringi ve halatlar",
  "dovus-judo": "Judo minderinde antrenman yapan iki sporcu",
  "kuvvet-weightlifting": "Halter yarışmasında barı kaldıran sporcu",
  "kuvvet-snatch": "Seyirci önünde baş üstüne ağırlık kaldıran sporcu",
  "bisiklet-road": "Şehir sokağında yarışan yol bisikletçileri",
  "bisiklet-mtb": "Orman parkurunda dağ bisikleti yarışı",
  "doga-climb-hand": "Tırmanış duvarında tutamağı kavrayan el",
  "doga-climb-wall": "Yüksek bir suni tırmanış duvarında tırmanan sporcu",
  "doga-mountain": "Karla kaplı bir zirveye yürüyen dağcılar",
  "olimpik-archery-target": "Okçuluk hedefine saplanmış oklar",
  "olimpik-archery-bow": "Okçuluk sahasında yay geren sporcu ve hedefler",
  "olimpik-rings": "Jimnastik halkaları",
  "dovus-karate": "Beyaz karate kıyafetli, siyah kuşaklı sporcu",
  "dovus-karate-2": "Karate antrenmanında iki sporcu",
  "dovus-taekwondo": "Tekvando müsabakasında tekme atan sporcu",
  "dovus-kickbox": "Ringde kick boks maçı",
  "dovus-boxing-match": "Kasklı iki amatör boksörün maçı",
  "dovus-boxing-match-2": "Seyirci önünde ringde boks maçı",
  "olimpik-fencing": "Eskrim düellosunda hamle yapan sporcular",
  "olimpik-gymnast": "Salonda havada takla atan cimnastikçi",
  "olimpik-shooting": "Atıcılık hedef kâğıdında isabetler",
  "doga-trail": "Dağ manzarasında patika koşusu yapan koşucu",
  "doga-trail-2": "Orman patikasında koşan sporcu",
  "doga-bouldering": "Tırmanış salonunda bouldering yapan sporcu",
  "doga-ski": "Karlı ormanda kros kayağı yapan sporcu",
  "kosu-triathlon": "Triatlonda koşu etabındaki sporcular",
  "kosu-triathlon-swim": "Triatlonda denizden çıkan yüzücüler",
  "kosu-triathlon-bike": "Triatlon geçiş alanında bisikletler",
  "kosu-sprint": "Pistte start bloğundan çıkan sprinter",
  "kosu-longjump": "Uzun atlamada kuma inen sporcu",
  "kosu-javelin": "Cirit atan sporcu",
  "su-openwater": "Açık denizde yüzen sporcular",
  "su-erg": "Kürek ergometresinde antrenman",
  "su-sailing": "Açık denizde yarışan yelkenliler",
  "su-sup": "Ayakta kürek (SUP) tahtasında kürek çeken sporcu",
  "su-canoe": "Gölde kano yarışı",
  "bisiklet-velodrome": "Velodromda pist bisikleti süren sporcu",
  "fonksiyonel-calisthenics": "Amuda kalkarak kalistenik hareketi yapan sporcu",
  "fonksiyonel-ocr": "Engelli koşuda çamurda ilerleyen sporcu",
  "kuvvet-strongman": "Ağır torba taşıyan strongman sporcusu",
};

const LOCAL_BY_CAT = {
  hyrox: ["hyrox-sled", "hyrox-sled-2", "sled-stadium", "sled-water", "rower", "medball-rack", "kb-rack", "run-start", "chalk-hands"],
  crossfit: ["comp-overhead", "comp-lift", "comp-women", "comp-barbell", "comp-crowd", "comp-judge", "comp-rings", "comp-win", "comp-night-tr", "comp-pullups-tr", "rope-climb", "box-jumps", "barbell-floor", "overhead-woman"],
  kosu: ["run-start", "run-finish", "run-track", "silhouette", "hero-alt", "doga-trail", "doga-trail-2", "kosu-triathlon", "kosu-triathlon-swim", "kosu-triathlon-bike", "kosu-sprint", "kosu-longjump", "kosu-javelin"],
  fonksiyonel: ["kb-floor", "kb-rack", "medball-rack", "ropes", "rings-gym", "box-jumps", "chalk-hands", "barbell-mist", "gym-industrial", "athlete-rest", "fonksiyonel-calisthenics", "fonksiyonel-ocr"],
  bilim: ["athlete-rest", "barbell-mist", "run-track", "chalk-hands", "kb-floor", "gym-industrial"],
  kuvvet: ["kuvvet-weightlifting", "kuvvet-snatch", "kuvvet-strongman", "barbell-floor", "chalk-hands"],
  dovus: ["dovus-wrestling", "dovus-wrestling-2", "dovus-boxing-gym", "dovus-boxing-match", "dovus-boxing-match-2", "dovus-judo", "dovus-karate", "dovus-karate-2", "dovus-taekwondo", "dovus-kickbox"],
  su: ["su-swim-race", "su-swim-back", "su-openwater", "su-rowing", "su-erg", "su-kayak", "su-canoe", "su-sailing", "su-sup"],
  bisiklet: ["bisiklet-road", "bisiklet-mtb", "bisiklet-velodrome", "kosu-triathlon-bike"],
  doga: ["doga-climb-hand", "doga-climb-wall", "doga-bouldering", "doga-mountain", "doga-trail", "doga-trail-2", "doga-ski"],
  olimpik: ["olimpik-archery-target", "olimpik-archery-bow", "olimpik-rings", "olimpik-gymnast", "olimpik-fencing", "olimpik-shooting"],
  // Seri postları (çok branşlı listeler): tüm branş fotoğrafları; sorgu eşleşmesi listedeki branşlarınkini seçer
  genel: ["comp-field", "comp-crowd", "gym-flags", "hero-gym", "comp-win", "barbell-floor"],
};
// Seri postları (çok branşlı listeler): tüm branş fotoğrafları; sorgu eşleşmesi listedeki branşlarınkini seçer
LOCAL_BY_CAT.yaris = [...new Set(["run-start", "run-finish", "comp-win", "comp-field", "hyrox-sled", "comp-overhead",
  ...["kosu", "kuvvet", "dovus", "su", "bisiklet", "doga", "olimpik"].flatMap((k) => LOCAL_BY_CAT[k])])];
LOCAL_BY_CAT.basari = LOCAL_BY_CAT.yaris;
// Bu kategorilerde sorguyla eşleşmeyen havuz fotoğrafı kullanılmaz (başka branşın fotoğrafı yanıltır)
const MULTI_SPORT = new Set(["kosu", "kuvvet", "dovus", "su", "bisiklet", "doga", "olimpik", "yaris", "basari"]);

async function getJson(url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, ...headers }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) { console.warn(`foto API ${new URL(url).hostname}: HTTP ${r.status}`); return null; }
    return await r.json();
  } catch (e) { console.warn(`foto API ${new URL(url).hostname}: ${String(e?.message ?? e).slice(0, 120)}`); return null; }
}

async function pexels(q, n) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const j = await getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=portrait&per_page=${Math.max(n * 3, 10)}`, { authorization: key });
  return (j?.photos ?? []).map((p) => ({ id: `pexels:${p.id}`, url: p.src.large2x, credit: `Foto: ${p.photographer} / Pexels`, alt: p.alt ?? "", license: "Pexels lisansı" }));
}

// Pixabay: ücretsiz anahtar, Pixabay İçerik Lisansı (atıf gerekmez). Görsel indirilip kendi sunucumuzdan kullanılır.
async function pixabay(q, n) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  const j = await getJson(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q.slice(0, 100))}&image_type=photo&orientation=vertical&category=sports&safesearch=true&min_width=1000&per_page=${Math.max(n * 3, 10)}`);
  const GENERIC = new Set(["race", "racing", "competition", "sport", "sports", "city", "street", "athlete", "athletes", "the", "and", "with", "start", "event", "outdoor", "gym", "training", "man", "woman", "people"]);
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !GENERIC.has(w));
  const relevant = (tags) => { const tg = String(tags ?? "").toLowerCase(); return words.length && words.some((w) => tg.includes(w.replace(/(ing|er|ers|s)$/, ""))); };
  return (j?.hits ?? []).filter((h) => h.largeImageURL && relevant(h.tags)).map((h) => ({ id: `pixabay:${h.id}`, url: h.largeImageURL, credit: "Foto: Pixabay", alt: String(h.tags ?? ""), license: "Pixabay İçerik Lisansı" }));
}

async function openverse(q, n) {
  const j = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&size=large&page_size=${Math.max(n * 3, 10)}&mature=false`);
  const BLOCK = /rawpixel|department of defense|u\.s\. army|army|navy|air force|marine|military|wheelchair|paralymp/i;
  return (j?.results ?? []).filter((r) => r.url && (r.width ?? 0) >= 900 && !BLOCK.test(`${r.creator} ${r.title} ${r.source} ${r.provider} ${r.url}`)).map((r) => ({
    id: `ov:${r.id}`, url: r.url, alt: r.title ?? "", license: `${String(r.license).toUpperCase()} ${r.license_version ?? ""}`.trim(),
    credit: `Foto: ${(r.creator || "bilinmiyor").slice(0, 40)} / ${String(r.license).toUpperCase()} ${r.license_version ?? ""}`.trim(),
  }));
}

// sharp metadata() AVIF dosyalarını "heif" olarak raporlar; heif yalnızca AV1 sıkıştırmalıysa (AVIF) kabul edilir
const IMG_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "tiff"]);
const MAX_BYTES = 12e6;

// Dış fotoğraf indirme (Pexels/Openverse URL'leri): SSRF korumalı safeGet, yalnızca https, gövde 12 MB ile sınırlı.
// Gövde gerçek bir görsel değilse (HTML sayfası, kesik dosya vb.) null döner; findImages o adayı atlar,
// böylece bozuk veri renderPost'taki sharp'a ulaşıp ücretli API çağrılarından sonra çalışmayı düşürmez.
export async function download(url) {
  try {
    const r = await safeGet(url, { timeout: 20000, maxBytes: MAX_BYTES, headers: { "user-agent": UA }, allowHttp: false });
    if (!r?.ok || r.buf.length <= 20000) return null;
    // safeGet sınırı aşan gövdeyi sessizce keser (ok:true döner): sınıra çok yakın gövde kesik sayılır
    if (r.buf.length >= MAX_BYTES - 256 * 1024) return null;
    const m = await sharp(r.buf).metadata();
    const avif = m.format === "heif" && m.compression === "av1";
    if ((!IMG_FORMATS.has(m.format) && !avif) || (m.width ?? 0) < 400) return null;
    // Tam çözme denemesi, render.mjs toUri ile birebir aynı boru hattı: kesik/bozuk dosya (ör. EOI'siz JPEG) burada elenir
    await sharp(r.buf).rotate().resize(1080, 1350, { fit: "cover", position: "attention" })
      .modulate({ saturation: 0.92 }).linear(1.06, -6).jpeg({ quality: 84 }).toBuffer();
    return r.buf;
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
  let locals = hasLocal ? [...LOCAL_BY_CAT[category ?? "genel"]].sort(() => Math.random() - 0.5) : [];
  // Çok branşlı kategorilerde (dövüş, su, olimpik...) sorgudaki sporla eşleşen fotoğraflar varsa yalnızca onlar kullanılır:
  // güreş haberine boks ringi, yüzme haberine kano fotoğrafı gelmesin.
  // Anahtar = foto id'sinde geçen parça; değer = o fotoğrafı uygun kılan İngilizce sorgu sözcükleri
  const SPORT = { swim: /swim|pool/, rowing: /rowing boat|regatta|\browers?\b|scull|\bcrew\b/, kayak: /kayak|canoe|paddl/, wrestling: /wrestl/, boxing: /box(?!ing day)/, judo: /judo/,
    weightlifting: /weightlift|snatch|clean|jerk/, snatch: /weightlift|snatch/, road: /road|cycl/, mtb: /mountain bik|mtb/,
    climb: /climb|boulder/, marathon: /marathon|runner|running/, start: /marathon|runner|running/, finish: /marathon|runner|running/, sled: /hyrox|sled/, overhead: /crossfit/, mountain: /mountain(?! bik| run)|summit|alpin/, archery: /archer|arrow/, rings: /gymnast|rings/,
    karate: /karate|kumite|kata\b/, taekwondo: /taekwondo|tekvando/, kickbox: /kickbox|kick box|muay/, fencing: /fenc|epee|sabre|foil/,
    trail: /trail|ultra|mountain run|skyrun/, triathlon: /triathlon|ironman|duathlon|aquathlon|transition/, openwater: /open water|openwater|sea swim|channel swim/,
    erg: /ergomet|rowing machine|indoor row|concept2/, sprint: /sprint|athletics|track and field|100m|200m|400m|hurdle/, longjump: /long jump|triple jump|high jump/,
    javelin: /javelin|discus|shot put|hammer throw|throw/, gymnast: /gymnast|vault|balance beam|floor exercise/, bouldering: /boulder|climb/,
    ski: /\bski\b|skiing|skier|biathlon/, sailing: /sail|regatta|yacht/, sup: /stand up paddle|\bsup\b|paddleboard/, canoe: /canoe|kayak/,
    velodrome: /velodrome|track cycling|keirin/, shooting: /shooting|rifle|pistol|shotgun|skeet/, calisthenics: /calisthenic|street workout|handstand/,
    ocr: /obstacle|\bocr\b|spartan|mud run|tough mudder/, strongman: /strongman|atlas stone|log press|yoke/ };
  const fits = (id, q) => Object.entries(SPORT).some(([k, re]) => id.includes(k) && re.test(q.toLowerCase()));
  // Sorgu sırasıyla dönüşümlü seçim: her sorgudan (branştan) önce birer fotoğraf, sonra kalanlar
  const perQuery = queries.map((q) => locals.filter((id) => fits(id, q)));
  const match = [];
  for (let i = 0; perQuery.some((l) => l.length > i); i++) for (const l of perQuery) if (l[i] && !match.includes(l[i])) match.push(l[i]);
  if (match.length) locals = match;
  else {
    // Kategoride sorguyla eşleşen foto yoksa (ör. yüzme haberi "olimpik" sınıflandı) tüm kütüphanede branşa göre ara;
    // alakasız bir kategori fotoğrafı (okçuluk, halka) yüzme haberine girmesin
    const every = [...new Set(Object.values(LOCAL_BY_CAT).flat())];
    const pq = queries.map((q) => every.filter((id) => fits(id, q)));
    const m2 = [];
    for (let i = 0; pq.some((l) => l.length > i); i++) for (const l of pq) if (l[i] && !m2.includes(l[i])) m2.push(l[i]);
    if (m2.length) locals = m2;
    // Çok branşlı kategoride hiç eşleşme yoksa kategori havuzundan rastgele foto KONMAZ (karate haberine güreş fotoğrafı gibi):
    // Openverse denenir, o da yoksa post fotoğrafsız kalır ve paylaşılmaz
    else if (MULTI_SPORT.has(category)) locals = [];
  }
  const usedLocal = new Set(out.map((o) => o.id));
  for (let i = 0; out.length < n && i < locals.length; i++) {
    const f = path.join(LOCAL, `${locals[i]}.webp`);
    if (fs.existsSync(f) && !usedLocal.has(`local:${locals[i]}`) && !usedIds.has(`local:${locals[i]}`)) out.push({ id: `local:${locals[i]}`, buf: fs.readFileSync(f), credit: "Foto: Pexels", alt: LOCAL_ALT[locals[i]] ?? locals[i], license: "Pexels lisansı" });
  }
  // Yerelde uygun foto yoksa Pixabay (etiket alaka süzgeçli)
  for (const q of queries) { if (out.length < (locals.length ? Math.min(n, 1) : n)) await take(await pixabay(q, n)); }
  // Son çare: Openverse (filigranlı/ilgisiz kaynaklar elenir)
  for (const q of queries) { if (out.length < (hasLocal && locals.length ? Math.min(n, 1) : n)) await take(await openverse(q, n)); }
  return out;
}
