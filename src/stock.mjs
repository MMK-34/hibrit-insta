// Stok (kalıcı bilgi) postları: önceden yazılır, kontrol edilir, kuyrukta bekler.
// Haber paylaşılmayan günlerde akşam çalışmasında sırayla paylaşılır.
//   node src/stock.mjs            -> kuyruk 4'ün altındaysa 6'ya tamamla (çalışma başına en fazla 1 yeni; günde en fazla 3 deneme)
//   node src/stock.mjs --add 2    -> 2 yeni stok üret
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writePost, reviewPost } from "./plan.mjs";
import { guardPost } from "./guard.mjs";
import { verifyGate, logRejected, failText } from "./verify.mjs";
import { STOCK_TOPICS, POSTING } from "./config.mjs";
import { statTopics } from "./stats.mjs";

// Tablo başlıkları veriyi arşivle sınırlar (genelleme yok); takvim verisi kullanan konularda kaynak "arşiv ve takvim"
const STAT_TABLE_TITLE = {
  "stat-tr-yillara-gore": "Arşivimizde yıllara göre Türkiye yarışmaları",
  "stat-tr-sehirler": "Arşivimizde ve takvimimizde şehirlere göre",
  "stat-takvim-ulkeler": "Takvimimizde en çok yer alan ülkeler",
  "stat-takvim-aylar": "Takvimimizde ay ay yarışmalar",
  "stat-hyrox-ulkeler": "Takvimimizdeki HYROX yarışları, ülkelere göre",
  "stat-crossfit-hareketler": "Arşivimizdeki workout'larda hareketler",
  "stat-yarisma-suresi": "Arşivimizde yarışma süreleri",
};
const statSource = (t) => (/takvim/i.test(`${t.note} ${t.id}`) ? "Hibrit Portal yarışma arşivi ve takvimi" : t.sourceName);

// Havuz: bilgi konuları + koddan hesaplanan istatistik konuları (sırayla karışık: 2 bilgi, 1 istatistik)
function topicPool() {
  let stats = [];
  try { stats = statTopics().map((t) => ({ ...t, stat: true })); } catch (e) { console.warn("istatistik konuları okunamadı:", e.message); }
  const out = [];
  let si = 0;
  STOCK_TOPICS.forEach((t, i) => { out.push(t); if (i % 2 === 1 && si < stats.length) out.push(stats[si++]); });
  while (si < stats.length) out.push(stats[si++]);
  return out;
}

const FILE = "state/stock.json";
const DRY = process.argv.includes("--dry");
const DAILY_MAX = 3; // günde (İstanbul takvim günü) en fazla stok üretim denemesi: maliyet emniyeti
const FAIL_MAX = 2, FAIL_REST_DAYS = 30; // FAIL_MAX kez düşen konu, son düşüşten sonra FAIL_REST_DAYS gün denenmez

/** İstanbul takvim günü: "YYYY-MM-DD" */
export const istDay = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: POSTING.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const dayDiff = (a, b) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5;

/** Konu dinlenmede mi: en az FAIL_MAX başarısızlık ve sonuncusu FAIL_REST_DAYS günden yeni (tarih bozuksa dinlenmede sayılmaz). */
export function isResting(st, id, today) {
  const f = st.fails?.[id];
  if (!f || !(f.n >= FAIL_MAX)) return false;
  const d = dayDiff(f.last, today);
  return Number.isFinite(d) && d < FAIL_REST_DAYS;
}

/** Sıradaki konu (durumu değiştirmez): kuyrukta ve dinlenmede olmayan ilk kullanılmamış konu;
 *  yoksa (liste bitti) baştan ilk uygun konu; hiç uygun konu yoksa null. */
export function pickTopic(st, pool, today) {
  const inQueue = new Set((st.queue ?? []).map((q) => q.topic));
  const used = st.used ?? [];
  const ok = (t) => !inQueue.has(t.id) && !isResting(st, t.id, today);
  return pool.find((t) => ok(t) && !used.includes(t.id)) ?? pool.find(ok) ?? null;
}

/** Konu sonucu: başarıda sayaç silinir, başarısızlıkta artar ve tarih güncellenir. */
export function noteTopicResult(st, id, ok, today) {
  st.fails ??= {};
  if (ok) delete st.fails[id];
  else st.fails[id] = { n: (st.fails[id]?.n ?? 0) + 1, last: today };
}

/** Bugün kalan üretim denemesi. */
export function dailyLeft(st, today) {
  return st.daily?.day === today ? Math.max(0, DAILY_MAX - (st.daily.attempts ?? 0)) : DAILY_MAX;
}

export function countAttempt(st, today) {
  if (st.daily?.day !== today) st.daily = { day: today, attempts: 0 };
  st.daily.attempts = (st.daily.attempts ?? 0) + 1;
}

/** Dosya yoksa boş kuyruk; dosya bozuksa HATA (üzerine yazılmasın diye). */
export function loadStock() {
  if (!fs.existsSync(FILE)) return { queue: [], used: [], fails: {} };
  let st;
  try { st = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { throw new Error(`${FILE} bozuk (JSON okunamadı), dokunulmadı: ${e.message}`); }
  st.queue ??= [];
  st.used ??= [];
  st.fails ??= {}; // eski dosyada yok: { [konuId]: { n, last: "YYYY-MM-DD" } }
  return st;
}

export function saveStock(st) {
  if (DRY) return; // dry çalışmada durum yazılmaz
  fs.mkdirSync("state", { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(st, null, 2) + "\n");
  fs.renameSync(`${FILE}.tmp`, FILE);
}

// Konu seçimi ve deneme sayımı fillStock'ta; burada yalnızca üretim. null = bu konu düştü.
async function makeOne(topic) {
  const pick = { kind: "bilgi", format: "carousel", category: topic.cat, score: 6 };
  const sources = topic.stat ? [{
    id: `stock:${topic.id}`, source: topic.sourceName, title: topic.title, url: topic.sourceUrls?.[0] ?? "",
    snippet: `Konu: ${topic.title}. Bu bir VERİ/İSTATİSTİK postudur (kalıcı bilgi; tazelik kuralı uygulanmaz). `
      + "Aşağıdaki veri Hibrit Portal yarışma arşivinden kodla hesaplandı ve postta kullanılabilecek TEK sayı kaynağıdır: sayıları değiştirme, yuvarlama, yeni sayı ekleme. "
      + "Tablo slaytını sistem ekleyecek; sen kapak (başlıkta en çarpıcı bulgu), 1-2 metin slaytı (bağlam ve yorum, örneklem uyarısıyla) ve son slaytı yaz. "
      + "Başlıklarda ve metinde genelleme yapma: veri tüm Türkiye'yi ya da dünyayı değil, Hibrit Portal arşivini ve takvimini kapsar ('arşivimizde', 'takvimimizde' gibi sınırla). Her listede tüm öğeleri tam adıyla yaz. "
      + "Örneklemin sınırlı olduğunu dürüstçe belirt. web_search gerekmez. primarySource alanına 'Hibrit Portal yarışma arşivi' yaz.\nVERİ:\n" + topic.dataText,
  }] : [{
    id: `stock:${topic.id}`, source: "Hibrit Portal", title: topic.title, url: "",
    snippet: `Konu: ${topic.brief}. Bu bir KALICI BİLGİ postudur, haber değildir; tazelik kuralı uygulanmaz. `
      + "web_search ile resmî ve bilimsel kaynakları (organizatörün kural kitabı, federasyon, hakemli araştırma, pozisyon bildirisi) bul ve yalnızca doğruladığın bilgileri yaz. "
      + "Kaydedilmeye değer, öğretici ve uygulanabilir olsun. primarySource alanına ana kaynağın adını yaz.",
  }];

  // Stokta fotoğraf yayın anında lisanslı kütüphaneden seçilir: "gorsel" maddesi bu aşamada uygulanamaz.
  // İstatistikte sayıların kaynağı koddan hesaplanan arşiv verisidir: kaynak sitesinin açılması / tarih-yer-ad web doğrulaması aranmaz;
  // sayılar, başlık, kaynak satırı ve alıntı kuralı aynen denetlenir.
  const skipItems = topic.stat ? ["gorsel", "kaynak", "tarih", "yer", "resmi_ad", "sporcu"] : ["gorsel"];
  let feedback = "", g = null, sourceName = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const draft = await writePost(pick, sources, feedback);
    if (!draft.factsOk) { console.log("stok: kaynak yetersiz:", topic.id); return null; }
    const rev = { approve: true }; // editör adımı kaldırıldı (maliyet)
    if (!rev.approve) { console.log("stok: editör reddetti:", topic.id, (rev.issues ?? []).join(" | ").slice(0, 300)); feedback = (rev.issues ?? []).join(" | "); continue; }
    if (rev.fixed?.slides?.length && rev.fixed.caption) {
      // Editör yalnızca metin alanlarını düzeltebilir
      const { slides, caption, hashtags, imageQueries } = rev.fixed;
      Object.assign(draft, { slides, caption, ...(hashtags ? { hashtags } : {}), ...(imageQueries ? { imageQueries } : {}) });
    }
    // İstatistik postu: tablo slaytı koddan eklenir (kapaktan hemen sonra)
    if (topic.stat) {
      const table = { type: "table", title: STAT_TABLE_TITLE[topic.id] ?? "Arşivimizdeki veriler", columns: topic.table.columns, rows: topic.table.rows, note: topic.note, ...(topic.table.highlight ? { highlight: topic.table.highlight } : {}) };
      draft.slides = [draft.slides[0], table, ...draft.slides.slice(1).filter((s) => s.type !== "table")];
    }
    sourceName = topic.stat ? statSource(topic) : (draft.primarySource || "Hibrit Portal derlemesi");
    const gg = guardPost(draft, { sourceName });
    if (!gg.ok) { console.log("stok: kontrolden geçmedi:", topic.id, gg.reason); feedback = gg.reason; continue; }
    const sourceUrls = (topic.stat ? topic.sourceUrls ?? [] : (draft.evidence ?? []).map((x) => x.url)).filter((u) => /^https:\/\//.test(u ?? "")).slice(0, 6);
    const gate = await verifyGate(gg.post, { sourceUrls, photos: [], sourceName, referenceData: topic.stat ? topic.dataText : "", skipItems });
    if (gate.ok) { g = gg; break; }
    console.log(`stok: doğrulama düştü (deneme ${attempt}):`, topic.id, `
${failText(gate.fails).slice(0, 800)}`);
    if (attempt === 2) logRejected({ title: topic.title, url: "stok", kind: "stok", fails: gate.fails });
    feedback = failText(gate.fails);
  }
  if (!g) return null;
  return { id: `stock:${topic.id}:${Date.now().toString(36)}`, topic: topic.id, category: topic.cat, sourceName, post: g.post, createdAt: new Date().toISOString() };
}

/** Kuyruk min'in altındaysa target'a tamamlar (çalışma başına en fazla maxNew). force: koşulsuz bu kadar üret.
 *  Her iki durumda da günlük DAILY_MAX deneme sınırı geçerli; uygun konu kalmazsa durur. */
function botPaused() { try { return JSON.parse(fs.readFileSync("state/posted.json", "utf8")).paused?.reason === "kredi"; } catch { return false; } }

export async function fillStock({ min = 4, target = 6, maxNew = 1, force = 0 } = {}) {
  const st = loadStock();
  if (botPaused()) { console.log("stok: Anthropic kredisi yok, stok üretimi atlandı"); return st; }
  const today = istDay();
  let need = force || (st.queue.length < min ? Math.min(target - st.queue.length, maxNew) : 0);
  let tries = 0;
  const maxTries = need + 3;
  while (need > 0 && tries++ < maxTries) {
    if (dailyLeft(st, today) <= 0) { console.log(`stok: günlük deneme sınırı (${DAILY_MAX}) doldu, yarın devam`); break; }
    const topic = pickTopic(st, topicPool(), today);
    if (!topic) { console.log("stok: uygun konu yok (hepsi kuyrukta ya da dinlenmede)"); break; }
    if (st.used.includes(topic.id)) st.used = []; // liste bitti: başa dön
    st.used.push(topic.id);
    countAttempt(st, today);
    saveStock(st); // deneme üretimden önce yazılır: çalışma çökse de sayılır
    const item = await makeOne(topic);
    noteTopicResult(st, topic.id, !!item, today);
    if (item) {
      st.queue.push(item);
      need--;
      console.log("stok eklendi:", item.topic, "| kuyruk:", st.queue.length);
    }
    saveStock(st);
  }
  saveStock(st);
  return st;
}

// Doğrudan çalıştırıldıysa
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--add");
  const st = await fillStock(i > 0 ? { force: Number(process.argv[i + 1] || 1) } : {});
  console.log("kuyruk:", st.queue.map((q) => q.topic).join(", ") || "(boş)");
}
