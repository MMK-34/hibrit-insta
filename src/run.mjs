// Ana akış. Günde ~5 kez çalışır (09, 12, 15, 18, 21 TR). Her çalışmada en fazla 1 post.
// Sabah ilk çalışma ve akşam son çalışma, gün boş geçmesin diye eşiği düşürür.
//   node src/run.mjs          -> gerçek paylaşım
//   node src/run.mjs --dry    -> yalnızca üret: out/<tarih>/ altına görsel + caption
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { collect, articleText, upcomingEvents } from "./collect.mjs";
import { findImages } from "./images.mjs";
import { selectNews, writePost } from "./plan.mjs";
import { renderPost } from "./render.mjs";
import { uploadFiles } from "./upload-github.mjs";
import { publish } from "./publish.mjs";
import { notify } from "./notify.mjs";
import { POSTING } from "./config.mjs";

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force"); // eşiği yok say, en iyi haberi paylaş
const STATE = "state/posted.json";

const trNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: POSTING.timezone }));
const now = trNow();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const hour = now.getHours();
const AYLAR = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const dateLabel = `${now.getDate()} ${AYLAR[now.getMonth()]} ${now.getFullYear()}`;

const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { posts: [] };
const postedIds = new Set(state.posts.flatMap((p) => p.ids));
const usedPhotos = new Set(state.posts.flatMap((p) => p.photos ?? []).filter((id) => !id.startsWith("local:")));
const todayCount = state.posts.filter((p) => p.day === today && !p.dry).length;

function log(...a) { console.log(`[${today} ${hour}:00]`, ...a); }

async function main() {
  if (!DRY && todayCount >= POSTING.maxPerDay) return log(`Günlük limit dolu (${todayCount}).`);
  const isMorning = hour <= POSTING.morningHour + 1;
  const isLast = hour >= 20;
  // Gün boşsa sabah/akşam eşiği düşer; aksi hâlde yalnızca güçlü haber paylaşılır.
  const threshold = FORCE ? 1 : (todayCount === 0 && (isMorning || isLast)) ? 4 : POSTING.minScore;

  const { items: news, report } = await collect();
  const items = [...news, ...(await upcomingEvents())];
  log(`${items.length} aday`, JSON.stringify(report));
  const picks = await selectNews(items, { limit: 3, postedIds });
  log("Seçim:", picks.map((p) => `${p.score}/${p.format}/${p.category}`).join(" "));

  for (const pick of picks) {
    if (pick.score < threshold) { log(`Eşik altı (${pick.score} < ${threshold}), bekleniyor.`); break; }
    const srcItems = pick.ids.map((id) => items.find((i) => i.id === id)).filter(Boolean).slice(0, 3);
    if (!srcItems.length) continue;
    for (const s of srcItems) if (!s.id.startsWith("cal:")) s.text = await articleText(s.url);
    const post = await writePost(pick, srcItems);
    if (!post.factsOk) { log("Kaynak yetersiz, atlandı:", srcItems[0].title); postedIds.add(srcItems[0].id); state.posts.push({ day: today, ids: pick.ids, skipped: true }); continue; }

    const slug = `${today}/${Date.now().toString(36)}`;
    const outDir = path.join("out", slug);
    // Görselsiz post yok: konuya uygun foto bulunamazsa paylaşılmaz.
    const photos = await findImages(post.imageQueries ?? [], Math.min(post.slides.length, 4), pick.category, usedPhotos);
    if (!photos.length) { log("Foto bulunamadı, atlandı."); continue; }
    const files = await renderPost({ ...post, photos, category: pick.category, source: srcItems[0].source, dateLabel }, outDir);
    const caption = `${post.caption.trim()}\n\n${post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`;
    fs.writeFileSync(path.join(outDir, "caption.txt"), `${caption}\n\n---\n${srcItems.map((s) => s.url).join("\n")}\n`);
    log(`Üretildi: ${outDir} (${files.length} slayt)`);

    if (DRY) { log(`Caption:\n${caption}`); break; }

    const urls = await uploadFiles(files, slug);
    const res = await publish(urls, caption);
    state.posts.push({ day: today, ids: pick.ids, photos: photos.map((p) => p.id), media: res.id, permalink: res.permalink, title: srcItems[0].title, at: new Date().toISOString() });
    log("Yayında:", res.permalink);
    await notify(`✅ Paylaşıldı (${todayCount + 1}/${POSTING.maxPerDay})\n${post.slides[0].title}\n${res.permalink}`);
    break; // çalışma başına 1 post
  }
}

try {
  await main();
} catch (e) {
  console.error(e);
  await notify(`⚠️ Hibrit Portal bot hatası:\n${e.message}`);
  process.exitCode = 1;
} finally {
  // 60 günden eski kayıtları buda; dry kayıtlarını kalıcı yazma
  const cutoff = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  state.posts = state.posts.filter((p) => p.day >= cutoff && (!p.dry || DRY));
  if (!DRY) { fs.mkdirSync("state", { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n"); }
}
