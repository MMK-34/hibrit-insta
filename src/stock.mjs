// Stok (kalıcı bilgi) postları: önceden yazılır, kontrol edilir, kuyrukta bekler.
// Haber paylaşılmayan günlerde akşam çalışmasında sırayla paylaşılır.
//   node src/stock.mjs            -> kuyruk 4'ün altındaysa 6'ya tamamla (çalışma başına en fazla 3 yeni)
//   node src/stock.mjs --add 2    -> 2 yeni stok üret
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writePost, reviewPost } from "./plan.mjs";
import { guardPost } from "./guard.mjs";
import { verifyGate, logRejected, failText } from "./verify.mjs";
import { STOCK_TOPICS } from "./config.mjs";
import { statTopics } from "./stats.mjs";

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

/** Dosya yoksa boş kuyruk; dosya bozuksa HATA (üzerine yazılmasın diye). */
export function loadStock() {
  if (!fs.existsSync(FILE)) return { queue: [], used: [] };
  let st;
  try { st = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { throw new Error(`${FILE} bozuk (JSON okunamadı), dokunulmadı: ${e.message}`); }
  st.queue ??= [];
  st.used ??= [];
  return st;
}

export function saveStock(st) {
  if (DRY) return; // dry çalışmada durum yazılmaz
  fs.mkdirSync("state", { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(st, null, 2) + "\n");
  fs.renameSync(`${FILE}.tmp`, FILE);
}

async function makeOne(st) {
  const inQueue = new Set(st.queue.map((q) => q.topic));
  const POOL = topicPool();
  let topic = POOL.find((t) => !st.used.includes(t.id) && !inQueue.has(t.id));
  if (!topic) { st.used = []; topic = POOL.find((t) => !inQueue.has(t.id)); } // liste bitti: başa dön
  if (!topic) return null;
  st.used.push(topic.id);

  const pick = { kind: "bilgi", format: "carousel", category: topic.cat, score: 6 };
  const sources = topic.stat ? [{
    id: `stock:${topic.id}`, source: topic.sourceName, title: topic.title, url: topic.sourceUrls?.[0] ?? "",
    snippet: `Konu: ${topic.title}. Bu bir VERİ/İSTATİSTİK postudur (kalıcı bilgi; tazelik kuralı uygulanmaz). `
      + "Aşağıdaki veri Hibrit Portal yarışma arşivinden kodla hesaplandı ve postta kullanılabilecek TEK sayı kaynağıdır: sayıları değiştirme, yuvarlama, yeni sayı ekleme. "
      + "Tablo slaytını sistem ekleyecek; sen kapak (başlıkta en çarpıcı bulgu), 1-2 metin slaytı (bağlam ve yorum, örneklem uyarısıyla) ve son slaytı yaz. "
      + "Örneklemin sınırlı olduğunu dürüstçe belirt. web_search gerekmez. primarySource alanına 'Hibrit Portal yarışma arşivi' yaz.\nVERİ:\n" + topic.dataText,
  }] : [{
    id: `stock:${topic.id}`, source: "Hibrit Portal", title: topic.title, url: "",
    snippet: `Konu: ${topic.brief}. Bu bir KALICI BİLGİ postudur, haber değildir; tazelik kuralı uygulanmaz. `
      + "web_search ile resmî ve bilimsel kaynakları (organizatörün kural kitabı, federasyon, hakemli araştırma, pozisyon bildirisi) bul ve yalnızca doğruladığın bilgileri yaz. "
      + "Kaydedilmeye değer, öğretici ve uygulanabilir olsun. primarySource alanına ana kaynağın adını yaz.",
  }];

  const draft = await writePost(pick, sources);
  if (!draft.factsOk) { console.log("stok: kaynak yetersiz:", topic.id); return null; }
  const rev = await reviewPost(draft, sources, { evergreen: true });
  if (!rev.approve) { console.log("stok: editör reddetti:", topic.id, (rev.issues ?? []).join(" | ").slice(0, 300)); return null; }
  if (rev.fixed?.slides?.length && rev.fixed.caption) {
    // Editör yalnızca metin alanlarını düzeltebilir
    const { slides, caption, hashtags, imageQueries } = rev.fixed;
    Object.assign(draft, { slides, caption, ...(hashtags ? { hashtags } : {}), ...(imageQueries ? { imageQueries } : {}) });
  }
  // İstatistik postu: tablo slaytı koddan eklenir (kapaktan hemen sonra)
  if (topic.stat) {
    const table = { type: "table", title: topic.title, columns: topic.table.columns, rows: topic.table.rows, note: topic.note, ...(topic.table.highlight ? { highlight: topic.table.highlight } : {}) };
    draft.slides = [draft.slides[0], table, ...draft.slides.slice(1).filter((s) => s.type !== "table")];
  }
  const sourceName = topic.stat ? topic.sourceName : (draft.primarySource || "Hibrit Portal derlemesi");
  const g = guardPost(draft, { sourceName });
  if (!g.ok) { console.log("stok: kontrolden geçmedi:", topic.id, g.reason); return null; }
  // Bağımsız doğrulama (fotoğraflar yayın anında seçilir; burada görsel maddesi lisanslı stok varsayımıyla denetlenir)
  const sourceUrls = (topic.stat ? topic.sourceUrls ?? [] : (draft.evidence ?? []).map((x) => x.url)).filter((u) => /^https:\/\//.test(u ?? "")).slice(0, 6);
  const gate = await verifyGate(g.post, { sourceUrls, photos: [{ alt: (g.post.imageQueries ?? []).join(", "), license: "Pexels lisansı (yayında seçilecek)", credit: "" }], sourceName, referenceData: topic.stat ? topic.dataText : "" });
  if (!gate.ok) { console.log("stok: doğrulama düştü:", topic.id, `\n${failText(gate.fails).slice(0, 800)}`); logRejected({ title: topic.title, url: "stok", kind: "stok", fails: gate.fails }); return null; }
  return { id: `stock:${topic.id}:${Date.now().toString(36)}`, topic: topic.id, category: topic.cat, sourceName, post: g.post, createdAt: new Date().toISOString() };
}

/** Kuyruk min'in altındaysa target'a tamamlar (çalışma başına en fazla maxNew). force: koşulsuz bu kadar üret. */
export async function fillStock({ min = 4, target = 6, maxNew = 3, force = 0 } = {}) {
  const st = loadStock();
  let need = force || (st.queue.length < min ? Math.min(target - st.queue.length, maxNew) : 0);
  let tries = 0;
  const maxTries = need + 3;
  while (need > 0 && tries++ < maxTries) {
    const item = await makeOne(st);
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
