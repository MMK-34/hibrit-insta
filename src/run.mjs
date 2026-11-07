// Ana akış. Günde ~5 kez çalışır (09, 12, 15, 18, 21 TR). Her çalışmada en fazla 1 post.
// Sabah ilk çalışma ve akşam son çalışma, gün boş geçmesin diye eşiği düşürür.
//   node src/run.mjs          -> gerçek paylaşım
//   node src/run.mjs --dry    -> yalnızca üret: out/<tarih>/ altına görsel + caption
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { collect, articleText, upcomingEvents } from "./collect.mjs";
import { findImages } from "./images.mjs";
import { selectNews, writePost, reviewPost } from "./plan.mjs";
import { renderPost } from "./render.mjs";
import { uploadFiles } from "./upload-github.mjs";
import { publish } from "./publish.mjs";
import { notify } from "./notify.mjs";
import { guardPost } from "./guard.mjs";
import { fetchEventLogo, fetchInstagramLogo } from "./logo.mjs";
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
const todayPosts = state.posts.filter((p) => p.day === today && p.media);
const todayCount = todayPosts.length;
// Bilgi + araştırma postları günde en fazla 2 (haberlerin arasına serpiştirilir)
const infoToday = todayPosts.filter((p) => p.kind === "bilgi" || p.kind === "arastirma").length;

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
  const picks = await selectNews(items, { limit: 4, postedIds });
  log("Seçim:", picks.map((p) => `${p.score}/${p.kind}/${p.format}/${p.category}`).join(" "));

  for (const pick of picks) {
    const isInfo = pick.kind === "bilgi" || pick.kind === "arastirma";
    if (isInfo && infoToday >= 2 && !FORCE) { log("Bugünkü bilgi/araştırma kotası dolu, atlandı."); continue; }
    const need = isInfo && !FORCE ? Math.min(threshold, 5) : threshold;
    if (pick.score < need) { log(`Eşik altı (${pick.kind} ${pick.score} < ${need}), bekleniyor.`); continue; }
    const srcItems = pick.ids.map((id) => items.find((i) => i.id === id)).filter(Boolean).slice(0, 3);
    if (!srcItems.length) continue;
    for (const s of srcItems) if (!s.id.startsWith("cal:")) s.text = await articleText(s.url);
    const draft = await writePost(pick, srcItems);
    if (!draft.factsOk) { log("Kaynak yetersiz, atlandı:", srcItems[0].title); postedIds.add(srcItems[0].id); state.posts.push({ day: today, ids: pick.ids, skipped: true }); continue; }

    // İkinci göz: yazı işleri kontrolü (doğruluk, haber değeri, Türkçe). Reddedilirse paylaşılmaz.
    const rev = await reviewPost(draft, srcItems);
    if (!rev.approve) { log("Editör reddetti:", (rev.issues ?? []).join(" | "), "|", srcItems[0].title); state.posts.push({ day: today, ids: pick.ids, skipped: "editör" }); postedIds.add(srcItems[0].id); continue; }
    // Editör yalnızca metin alanlarını düzeltebilir; resmî site/Instagram (dış adres) yazarın alanı olarak kalır
    if (rev.fixed?.slides?.length && rev.fixed.caption) {
      const { slides, caption, hashtags, imageQueries, eventName } = rev.fixed;
      Object.assign(draft, { slides, caption, ...(hashtags ? { hashtags } : {}), ...(imageQueries ? { imageQueries } : {}), ...(eventName ? { eventName } : {}) });
    }
    if ((rev.issues ?? []).length) log("Editör düzeltti:", rev.issues.join(" | "));

    // Kaynak adı: takvim kayıtlarında organizatör sitesi
    const sourceName = srcItems[0].id.startsWith("cal:") ? (() => { try { return new URL(srcItems[0].url).hostname.replace(/^www\./, ""); } catch { return "Yarış takvimi"; } })() : srcItems[0].source;
    const g = guardPost(draft, { sourceName });
    if (!g.ok) { log("Kontrolden geçmedi, atlandı:", g.reason, "|", srcItems[0].title); state.posts.push({ day: today, ids: pick.ids, skipped: g.reason }); continue; }
    const post = g.post;

    const slug = `${today}/${Date.now().toString(36)}`;
    const outDir = path.join("out", slug);
    // Görselsiz post yok: konuya uygun foto bulunamazsa paylaşılmaz.
    const photos = await findImages(post.imageQueries ?? [], Math.min(post.slides.length, 4), pick.category, usedPhotos);
    if (!photos.length) { log("Foto bulunamadı, atlandı."); continue; }
    // Etkinlik logosu: önce resmî site, sonra resmî Instagram profil fotoğrafı
    const eventLogo = (post.officialSite ? await fetchEventLogo(post.officialSite).catch(() => null) : null)
      ?? (post.officialInstagram ? await fetchInstagramLogo(post.officialInstagram).catch(() => null) : null);
    if (eventLogo) log("Etkinlik logosu:", eventLogo.source);
    const files = await renderPost({ ...post, photos, eventLogo, category: pick.category, source: sourceName, dateLabel }, outDir);
    const caption = post.caption; // guard: temizlenmiş metin + "Kaynak: ..." + hashtag
    fs.writeFileSync(path.join(outDir, "caption.txt"), `${caption}\n\n---\n${srcItems.map((s) => s.url).join("\n")}\n`);
    log(`Üretildi: ${outDir} (${files.length} slayt)`);

    if (DRY) { log(`Caption:\n${caption}`); break; }

    const urls = await uploadFiles(files, slug);
    const res = await publish(urls, caption);
    state.posts.push({ day: today, ids: pick.ids, kind: pick.kind, photos: photos.map((p) => p.id), media: res.id, permalink: res.permalink, title: srcItems[0].title, at: new Date().toISOString() });
    log("Yayında:", res.permalink);
    await notify(`✅ Paylaşıldı (${todayCount + 1}/${POSTING.maxPerDay})\n${post.slides[0].title}\n${res.permalink}`);
    break; // çalışma başına 1 post
  }
}

try {
  await main();
  // Sağlık alarmı: 48 saattir hiç paylaşım yoksa iş "başarısız" biter, GitHub hesap sahibine e-posta atar.
  if (!DRY) {
    const last = state.posts.filter((p) => p.media && p.at).map((p) => p.at).sort().pop();
    const firstRun = !state.posts.some((p) => p.media);
    if (!firstRun && last && Date.now() - new Date(last).getTime() > 48 * 36e5) {
      console.error(`UYARI: Son paylaşım ${last}. 48 saattir paylaşım yok, kontrol gerekli.`);
      await notify(`⚠️ Hibrit Portal: 48 saattir paylaşım yok (son: ${last}).`);
      process.exitCode = 1;
    }
  }
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
