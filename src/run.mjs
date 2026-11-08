// Ana akış. Saatte bir çalışır (07:30-22:30 TR). Çalışma başına en fazla POSTING.perRun post.
// Sabah ilk çalışma ve akşam son çalışma, gün boş geçmesin diye eşiği düşürür.
//   node src/run.mjs          -> gerçek paylaşım
//   node src/run.mjs --dry    -> yalnızca üret: out/<tarih>/ altına görsel + caption (durum dosyalarına yazılmaz)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { collect, articleText, upcomingEvents, resolveNewsUrl, courseCandidates } from "./collect.mjs";
import { findImages } from "./images.mjs";
import { eventPhotos, screenPhotos } from "./event-photos.mjs";
import { circle21Candidates, circle21Reference, circle21Events, c21Handle } from "./circle21.mjs";
import { igWatchCandidates } from "./ig-watch.mjs";
import { selectNews, writePost, reviewPost, creditProbe, isCreditError } from "./plan.mjs";
import { renderPost, renderStory } from "./render.mjs";
import { uploadFiles } from "./upload-github.mjs";
import { publish, preflight, publishStory } from "./publish.mjs";
import { notify } from "./notify.mjs";
import { guardPost } from "./guard.mjs";
import { INTRO_IMAGES, INTRO_CAPTION } from "./intro.mjs";
import { verifyGate, logRejected, failText } from "./verify.mjs";
import { scheduleFollowups, dueFollowup, markFollowup, followupInput, loadFollowups, norm } from "./followups.mjs";
import { loadStock, saveStock } from "./stock.mjs";
import { fetchEventLogo, fetchInstagramLogo, logoFromUrl } from "./logo.mjs";
import { POSTING } from "./config.mjs";
import { dueSeries, SERIES } from "./series.mjs";
import { writeSeries } from "./series.mjs";

const START = Date.now();
const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force"); // eşiği yok say, en iyi haberi paylaş
const STOCK = process.argv.includes("--stock"); // haber aramadan stoktan paylaş (test/elle)
const SERIES_FORCE = (() => { const i = process.argv.indexOf("--series"); return i > 0 ? process.argv[i + 1] : ""; })(); // test: --series hafta-sonu|kayit-acik|aylik
const DRY_COUNT = Number(process.argv[process.argv.indexOf("--count") + 1]) || 1; // dry testte işlenecek haber sayısı
const STATE = "state/posted.json";
const PER_RUN = POSTING.perRun ?? 2;
const MAX_PER_DAY = POSTING.maxPerDay ?? 12;
const MAX_DRAFTS_PER_DAY = POSTING.maxDraftsPerDay ?? 12; // ücretli taslak üretimi için günlük tavan
const BUDGET_MS = 30 * 60e3; // bu süreden sonra yeni haber/takip/stok işi başlatılmaz (adım zaman aşımı 40 dk)
const STOCK_MAX_ATTEMPTS = 2;

const trNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: POSTING.timezone }));
const now = trNow();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const hour = now.getHours();
const AYLAR = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const dateLabel = `${now.getDate()} ${AYLAR[now.getMonth()]} ${now.getFullYear()}`;

function log(...a) { console.log(`[${today} ${hour}:00]`, ...a); }

// Durum dosyası bozuksa: bildir ve dur; dosyanın üzerine YAZMA (elle düzeltilmeli)
let state;
try {
  state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { posts: [] };
  if (!state || typeof state !== "object" || (state.posts && !Array.isArray(state.posts))) throw new Error("beklenmeyen biçim");
  state.posts ??= [];
} catch (e) {
  console.error(`${STATE} okunamadı:`, e);
  await notify(`⚠️ Hibrit Portal: ${STATE} bozuk (${e.message}). Bot durdu, dosyaya dokunulmadı; elle düzeltin.`);
  process.exit(1);
}
const postedIds = new Set(state.posts.flatMap((p) => p.ids ?? []));
const usedPhotos = new Set(state.posts.flatMap((p) => p.photos ?? []).filter((id) => !id.startsWith("local:")));
const todayPosts = state.posts.filter((p) => p.day === today && p.media);
const todayCount = todayPosts.length;
// Bilgi + araştırma postları günde en fazla 2 (haberlerin arasına serpiştirilir); çalışma içinde paylaşıldıkça artar
let infoToday = todayPosts.filter((p) => p.kind === "bilgi" || p.kind === "arastirma").length;

// Günlük özet sayaçları: taslak / onay / red
state.daily ??= {};
function bump(k) { state.daily[today] ??= { drafts: 0, approved: 0, rejected: 0 }; state.daily[today][k]++; }

const budgetLeft = () => Date.now() - START < BUDGET_MS;
const draftCapReached = () => (state.daily[today]?.drafts ?? 0) >= MAX_DRAFTS_PER_DAY;

/** Durumu hemen diske yazar (dry'da asla). 60 günden eski kayıtlar budanır. Atomik: önce .tmp, sonra rename. */
function saveState() {
  if (DRY) return;
  const cutoff = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  state.posts = state.posts.filter((p) => p.day >= cutoff && !p.dry);
  for (const k of Object.keys(state.daily ?? {})) if (k < cutoff) delete state.daily[k];
  fs.mkdirSync("state", { recursive: true });
  fs.writeFileSync(`${STATE}.tmp`, JSON.stringify(state, null, 2) + "\n");
  fs.renameSync(`${STATE}.tmp`, STATE);
}

// Adım zaman aşımında (Actions SIGTERM/SIGINT gönderir) durumu kaybetme
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.error(`${sig} alındı, durum kaydediliyor`);
    try { saveState(); } catch (e) { console.error(e); }
    process.exit(1);
  });
}

/**
 * Son IG paylaşımlarının caption ilk satırları (durum dosyası kaybolursa tekrar önleme). Salt okunur GET;
 * state'te kayıtlı medya atlanır (onların başlıkları zaten listede). Hata -> log + boş liste.
 */
async function recentIgCaptions(limit = 12) {
  try {
    const token = process.env.IG_ACCESS_TOKEN, id = process.env.IG_USER_ID;
    if (!token || !id) return [];
    const host = token.startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com";
    const qs = new URLSearchParams({ fields: "caption,timestamp", limit: String(limit), access_token: token });
    const r = await fetch(`https://${host}/v23.0/${id}/media?${qs}`, { signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(`HTTP ${r.status} ${JSON.stringify(j.error ?? j).slice(0, 200)}`);
    const known = new Set(state.posts.map((p) => p.media).filter(Boolean));
    return (j.data ?? []).filter((m) => !known.has(m.id)).map((m) => String(m.caption ?? "").split("\n")[0].trim().slice(0, 160)).filter(Boolean);
  } catch (e) {
    log("IG son paylaşımlar okunamadı, devam:", String(e?.message ?? e).slice(0, 200));
    return [];
  }
}
let igTitles = []; // state'te olmayan son IG paylaşımlarının başlıkları (selectNews tekrar önleme)
const SKIPPED = Symbol("atlandı"); // 45 dk kapısında atlanan çalışma: özet/alarm da çalışmaz

async function main() {
  let published = false, processed = 0, publishedCount = 0;
  // Kredi bittiyse: ücretli işlem yok. Yalnızca 1 token'lık yoklama; kredi gelmişse kendiliğinden devam.
  if (state.paused?.reason === "kredi" && !DRY) {
    try { await creditProbe(); } catch (e) {
      if (isCreditError(e)) { log("Anthropic kredisi yok; bot duraklatıldı (ödeme yapılmaz)."); return SKIPPED; }
      throw e;
    }
    log("Anthropic kredisi yeniden var; bot devam ediyor.");
    delete state.paused; saveState();
    await notify("⚠️ Hibrit Portal: Anthropic kredisi yeniden kullanılabilir, bot paylaşımlara devam ediyor.");
  }
  // Yedek cron: ana slot çalıştıysa (son 45 dk) zamanlanmış çalışma hiçbir şey yapmaz. Elle (workflow_dispatch) çalışmalar atlanmaz.
  // GitHub zamanlayıcısı ya da dış zamanlayıcı (Cloudflare Worker, trigger=cron): ikisi de aynı 45 dk kapısından geçer
  const SCHEDULED = process.env.GITHUB_EVENT_NAME === "schedule" || process.env.TRIGGER === "cron";
  if (!DRY && !FORCE && !STOCK && SCHEDULED && state.lastRunAt) {
    const ago = (Date.now() - new Date(state.lastRunAt).getTime()) / 60e3;
    if (ago >= 0 && ago < 45) {
      log(`Son çalışma ${Math.round(ago)} dk önce; atlandı`);
      // Workflow'daki stok tamamlama adımı da atlansın
      try { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "skipped=true\n"); } catch {}
      return SKIPPED;
    }
  }
  // Yalnızca zamanlanmış çalışmalar işaretlenir: elle (stok/force/test) çalışma sıradaki zamanlanmış slotu iptal etmesin
  if (!DRY && SCHEDULED) { state.lastRunAt = new Date().toISOString(); saveState(); }
  if (!DRY && todayCount >= MAX_PER_DAY) return log(`Günlük limit dolu (${todayCount}).`);
  if (!DRY) {
    // 48 saat alarmı için ilk canlı çalışma zamanı
    if (!state.deployedAt) { state.deployedAt = new Date().toISOString(); saveState(); }
    // Ücretli çağrılardan önce Instagram token/hesap kontrolü (hata -> bildirim + çıkış)
    try {
      const acc = await preflight();
      log(`IG ön kontrol tamam: @${acc.username ?? acc.id}`);
    } catch (e) {
      throw new Error(`Instagram ön kontrolü başarısız, ücretli çağrı yapılmadı: ${e.message}`);
    }
    // Durum kaybına karşı: son 12 IG paylaşımının başlığı da tekrar önleme listesine girer
    igTitles = await recentIgCaptions(12);
  }
  // Elle yeniden paylaşım: seri/takip çalışmadan yalnızca verilen haber işlenir
  if (process.argv.includes("--repost")) return repostOne(process.env.REPOST ?? "");
  // Canlıya alınınca ilk paylaşım: tanıtım postu (bir kez)
  if (!state.intro && !DRY) return publishIntro();
  if (STOCK) return publishStock();
  // Tekrarlayan seriler (hafta sonu yarışları, Türk sporcuların haftası, aylık takvim): günde bir kez, sabah 9'dan sonra
  if (SERIES_FORCE || (budgetLeft() && !draftCapReached() && todayCount < MAX_PER_DAY)) {
    try {
      const due = SERIES_FORCE ? (() => { const s = SERIES.find((x) => x.id === SERIES_FORCE); return s ? { s, key: `${s.id}:test`, ctx: s.ctx(now) } : null; })() : dueSeries(state, now);
      if (due && await publishSeries(due)) { published = true; publishedCount++; }
    } catch (e) {
    if (isCreditError(e)) throw e; // kredi bitti: üst seviyede duraklat
    console.error(e); log("Seri postu hatası:", e.message);
    }
    if (SERIES_FORCE) return;
  }
  if (process.argv.includes("--followup")) return publishFollowup(); // test: vadesi gelen takip postu
  const isMorning = hour <= POSTING.morningHour + 1;
  const isLast = hour >= 20;
  // Gün boşsa sabah/akşam eşiği düşer; aksi hâlde yalnızca güçlü haber paylaşılır.
  const threshold = FORCE ? 1 : (todayCount === 0 && (isMorning || isLast)) ? 4 : POSTING.minScore;

  // Haber seçimi hata verirse de takip/stok yedekleri çalışsın
  let items = [], picks = [];
  try {
    const { items: news, report } = await collect();
    items = [...news, ...(await upcomingEvents()), ...(await courseCandidates()), ...(await circle21Candidates().catch(() => []))];
    // Organizatör Instagram hesapları (yalnızca Instagram'da duyurulan yarışlar); circle21'deki Türkiye organizatörleri de izlenir
    try {
      const c21Handles = (await circle21Events().catch(() => [])).map(c21Handle).filter(Boolean);
      const ig = await igWatchCandidates(c21Handles);
      if (ig.length) log(`Instagram izleme: ${ig.length} yeni paylaşım`);
      items.push(...ig);
    } catch (e) { log("Instagram izleme hatası:", String(e?.message ?? e).slice(0, 160)); }
    log(`${items.length} aday`, JSON.stringify(report));
    // Tekrar önleme: son ~30 paylaşımın başlıkları seçime verilir; takvim adayları takip serisi / son başlıklarla eşleşirse elenir
    // IG başlıkları sona eklenir (selectNews son 30'u kullanır), aynı/eşdeğer başlık iki kez girmez
    const stateTitles = state.posts.filter((p) => p.media).slice(-30).flatMap((p) => [p.headline, p.title]).filter(Boolean);
    const seenNorm = new Set(stateTitles.map(norm));
    const igExtra = igTitles.filter((t) => { const k = norm(t); if (!k || seenNorm.has(k)) return false; seenNorm.add(k); return true; });
    if (igExtra.length) log(`IG'de state dışı ${igExtra.length} paylaşım başlığı tekrar önlemeye eklendi.`);
    const recentTitles = [...stateTitles, ...igExtra];
    let fuKeys = new Set();
    try { fuKeys = new Set(loadFollowups().map((f) => f.key)); } catch (e) { log("Takip listesi okunamadı:", e.message); }
    const recentNorm = recentTitles.map(norm);
    items = items.filter((i) => {
      if (!i.id.startsWith("cal:")) return true;
      const k = norm(i.eventName ?? "");
      if (k.length < 5) return true;
      const dup = fuKeys.has(k) || recentNorm.some((t) => t.includes(k));
      if (dup) log("Takvim adayı zaten işlendi, atlandı:", i.eventName);
      return !dup;
    });
    if (draftCapReached()) log(`Günlük taslak tavanı dolu (${MAX_DRAFTS_PER_DAY}), yeni taslak yok.`);
    else picks = await selectNews(items, { limit: 6, postedIds, recentTitles });
    log("Seçim:", picks.map((p) => `${p.score}/${p.kind}/${p.format}/${p.category}`).join(" "));
  } catch (e) {
    if (isCreditError(e)) throw e; // kredi bitti: üst seviyede duraklat
    console.error(e);
    log("Haber toplama/seçim hatası:", e.message);
    await notify(`⚠️ Hibrit Portal: haber seçimi başarısız, yedeklere geçiliyor:\n${e.message}`);
    process.exitCode = 1;
  }

  for (const pick of picks) {
    if (!budgetLeft()) { log("Zaman bütçesi doldu, yeni haber işlenmiyor."); break; }
    if (draftCapReached()) { log(`Günlük taslak tavanı dolu (${MAX_DRAFTS_PER_DAY}).`); break; }
    try {
      const isInfo = pick.kind === "bilgi" || pick.kind === "arastirma";
      if (isInfo && infoToday >= (POSTING.maxInfoPerDay ?? 4) && !FORCE) { log("Bugünkü bilgi/araştırma kotası dolu, atlandı."); continue; }
      const need = isInfo && !FORCE ? Math.min(threshold, 5) : threshold;
      if (pick.score < need) { log(`Eşik altı (${pick.kind} ${pick.score} < ${need}), bekleniyor.`); continue; }
      const srcItems = (pick.ids ?? []).map((id) => items.find((i) => i.id === id)).filter(Boolean).slice(0, 3);
      if (!srcItems.length) continue;
      // Google News bağlantısı yayıncının asıl adresine çözülür (yazar tam metni okur, doğrulayıcı sayfayı açabilir); id değişmez (tekrar önleme)
      for (const s of srcItems) if (!s.id.startsWith("cal:") && !s.id.startsWith("cfcourse:") && !s.id.startsWith("c21") && !s.id.startsWith("ig:")) { s.url = await resolveNewsUrl(s.url); s.text = await articleText(s.url); }
      // Kaynak adı: takvim kayıtlarında organizatör sitesi
      // Takvim kaydı: alan adı yazılmaz (guard link sayar); etkinliğin resmî sitesi olarak belirtilir
      const sourceName = srcItems[0].id.startsWith("ig:") ? `@${srcItems[0].handle} Instagram` : srcItems[0].id.startsWith("c21") ? "circle21 resmî kayıt sayfası" : srcItems[0].id.startsWith("cfcourse:") ? "CrossFit resmî kurs takvimi" : srcItems[0].id.startsWith("cal:") ? (srcItems[0].eventName ? `${String(srcItems[0].eventName).replace(/s+(20dd|kayıt.*|online.*|qualifier.*|(.*))$/i, "").replace(/s+20dd.*$/, "").trim()} resmî sitesi` : "Organizatörün resmî sitesi") : srcItems[0].source;

      const ready = await prepareVerified(pick, srcItems, sourceName);
      processed++;
      if (!ready) {
        state.posts.push({ day: today, ids: pick.ids, skipped: "doğrulama" }); postedIds.add(srcItems[0].id); saveState();
        if (DRY && processed >= DRY_COUNT) break;
        continue;
      }
      const res = await renderAndPublish(ready, { category: pick.category, sourceName: ready.sourceName ?? sourceName, ids: pick.ids, kind: pick.kind, title: srcItems[0].title, srcUrls: srcItems.map((x) => x.url) });
      if (DRY) { if (processed >= DRY_COUNT) break; continue; }
      if (res) {
        published = true;
        publishedCount++;
        if (isInfo) infoToday++; // aynı çalışmada ikinci bilgi/araştırma postu kotayı aşmasın
        // Duyuruysa takip serisini planla (+4 gün geçmiş edisyonlar, +9 gün geçmiş antrenmanlar)
        if (pick.kind === "duyuru" && ready.post.eventName) {
          try {
            const n = scheduleFollowups({ eventName: ready.post.eventName, officialSite: ready.post.officialSite, category: pick.category }, today);
            if (n) log(`Takip serisi planlandı: ${ready.post.eventName} (${n} post)`);
          } catch (e) { log("Takip serisi planlanamadı:", e.message); }
        }
      }
      // Çalışma başına en fazla PER_RUN post; günlük üst sınıra da uy
      if (publishedCount >= PER_RUN || todayCount + publishedCount >= MAX_PER_DAY) break;
    } catch (e) {
    if (isCreditError(e)) throw e; // kredi bitti: üst seviyede duraklat
      // Tek haberdeki hata çalışmayı durdurmaz: kaydedilir, sıradakine geçilir
      console.error(e);
      log("Haber işlenirken hata:", e.message);
      if (!DRY) state.posts.push({ day: today, ids: pick.ids ?? [], skipped: "hata", err: String(e.message).slice(0, 300), at: new Date().toISOString() });
      for (const id of pick.ids ?? []) postedIds.add(id);
      saveState();
      await notify(`⚠️ Hibrit Portal: bir haber işlenemedi, sıradakine geçildi:\n${String(e.message).slice(0, 500)}`);
    }
  }

  // Haber çıkmadıysa: vadesi gelen takip postu; o da yoksa günün son çalışmasında stoktan sıradaki hazır post
  if (!published && todayCount + publishedCount < MAX_PER_DAY) published = await publishFollowup();
  if (!published && ((isLast && todayCount === 0) || STOCK)) await publishStock();
}

/**
 * Yaz -> editör -> süzgeç -> foto -> iki bağımsız doğrulayıcı. Doğrulama düşerse gerekçesiyle BİR kez yeniden yazılır.
 * İkinci deneme de geçmezse null döner ve gerekçe state/rejected.json'a yazılır.
 */
// Kaynak metinlerden yarış kategorisi cümleleri çıkarılır: yazar kategori adı yazmasın (kural: kategori yazılmaz)
const CAT_WORDS = /(Beginner|Scaled|Intermediate|Advanced|Elite|Elit|RX|Masters?|Teens?|Hybrid)/;
const dropCategories = (txt) => String(txt ?? "").split(/(?<=[.!?])s+/).filter((s) => !(/kategori|divizyon|division|categor/i.test(s) && CAT_WORDS.test(s))).join(" ");

async function prepareVerified(pick, srcItems, sourceName) {
  srcItems = srcItems.map((s) => ({ ...s, text: dropCategories(s.text), snippet: dropCategories(s.snippet) }));
  bump("drafts");
  saveState(); // günlük taslak tavanı süreç kesilse de doğru sayılsın
  let feedback = "", lastFails = [];
  // Türkiye'deki bir yarıştan bahsediyorsa circle21 resmî kaydı (resmî ad, tarihler, kayıt dönemi) ek kaynak ve güvenilir referans olur
  const c21 = srcItems.some((s) => s.id.startsWith("c21")) ? null
    : await circle21Reference(srcItems.map((s) => `${s.title} ${s.text || s.snippet || ""}`).join(" ")).catch(() => null);
  if (c21) {
    log("circle21 resmî kaydı eşleşti:", c21.event.name);
    srcItems = [...srcItems, { id: `c21ref:${c21.event.id}`, logo: c21.event.logo, facts: c21.facts, handle: c21.handle, url: c21.event.url, title: `Resmî kayıt: ${c21.event.name}`, source: "circle21 resmî kayıt sayfası", text: c21.text }];
  }
  const ownC21 = srcItems.find((s) => s.id.startsWith("c21"));
  // Güvenilir referans: yalnızca kodun biçimlediği yapılandırılmış alanlar (serbest metin yazara kaynak olarak gider, burada yok)
  const referenceData = ownC21?.facts ? `circle21 resmî kayıt platformu, yapılandırılmış alanlar (ad, tarihler, kayıt dönemi, ücret, yer):\n${ownC21.facts}` : "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const draft = await writePost(pick, srcItems, feedback);
    if (!draft.factsOk) { log("Kaynak yetersiz:", srcItems[0].title); lastFails = [{ model: "yazar", item: "kaynak", note: "factsOk=false" }]; break; }
    const rev = await reviewPost(draft, srcItems, { evergreen: /^(fu|stock):/.test(srcItems[0].id) });
    if (!rev.approve) { log("Editör reddetti:", (rev.issues ?? []).join(" | ").slice(0, 400)); lastFails = (rev.issues ?? []).map((n) => ({ model: "editör", item: "editör", note: n })); feedback = failText(lastFails); continue; }
    // Editör yalnızca metin alanlarını düzeltebilir; resmî site/Instagram (dış adres) yazarın alanı olarak kalır
    if (rev.fixed?.slides?.length && rev.fixed.caption) {
      const { slides, caption, hashtags, imageQueries, eventName } = rev.fixed;
      Object.assign(draft, { slides, caption, ...(hashtags ? { hashtags } : {}), ...(imageQueries ? { imageQueries } : {}), ...(eventName ? { eventName } : {}) });
    }
    // Takip postlarında kaynak adı, yazarın dayandığı ana kaynaktır
    const srcName = srcItems[0].id.startsWith("fu:") && draft.primarySource ? draft.primarySource : sourceName;
    const g = guardPost(draft, { sourceName: srcName });
    if (!g.ok) { log("Süzgeçten geçmedi:", g.reason); lastFails = [{ model: "süzgeç", item: "süzgeç", note: g.reason }]; feedback = failText(lastFails); continue; }
    // Görselsiz post yok: konuya uygun foto bulunamazsa paylaşılmaz.
    // Önce etkinliğin kendi fotoğrafı (resmî site, resmî Instagram, kaynak haber); eksik kalırsa görsel denetimden geçen stok foto
    const topic = [g.post.eventName, srcItems[0].title, g.post.slides[0]?.title].filter(Boolean).join(" | ");
    if (ownC21?.logo) g.post.eventLogoUrl = ownC21.logo;
    const igSrc = srcItems.find((s) => s.id.startsWith("ig:"));
    if (!g.post.officialInstagram && igSrc?.curated && igSrc.handle) g.post.officialInstagram = igSrc.handle;
    // Organizatör hesabı yalnızca kaydın yapılandırılmış instagram alanından (doğrulanmış kullanıcı adı)
    if (!g.post.officialInstagram && ownC21?.handle) g.post.officialInstagram = ownC21.handle;
    const photos = await pickPhotos({ post: g.post, pages: [g.post.officialSite, ...srcItems.map((x) => x.url), ...(draft.evidence ?? []).map((x) => x.url)], topic, want: Math.min(g.post.slides.length, 4), category: pick.category });
    if (!photos.length) { log(`Foto bulunamadı (kategori ${pick.category}, sorgular: ${(g.post.imageQueries ?? []).join(" | ")}).`); lastFails = [{ model: "foto", item: "gorsel", note: "foto yok" }]; break; }
    const sourceUrls = [...srcItems.map((x) => x.url), ...(draft.evidence ?? []).map((x) => x.url)].filter((u) => /^https:\/\//.test(u ?? "")).slice(0, 6);
    // Açılamayan kaynakların (Instagram paylaşımı) metni doğrulayıcıya güvenilmez kaynak metni olarak verilir
    // Doğrulanmamış hesabın metni birincil kanıt sayılmaz: iddialar bağımsız kaynakla (circle21 kaydı ya da web) teyit edilmeli
    const sourceTexts = srcItems.filter((s) => s.id.startsWith("ig:")).map((s) => ({ label: s.curated ? s.source : `${s.source}: BİRİNCİL KANIT DEĞİL, her iddiayı bağımsız bir kaynakla teyit et; teyit edilemeyen iddia fail`, url: s.url, text: s.text }));
    const gate = await verifyGate(g.post, { sourceUrls, photos, sourceName: srcName, referenceData, sourceTexts });
    if (gate.ok) { log(`Doğrulama geçti (deneme ${attempt}).`); bump("approved"); return { post: g.post, photos, sourceName: srcName }; }
    lastFails = gate.fails;
    feedback = failText(gate.fails);
    log(`Doğrulama düştü (deneme ${attempt}):\n${feedback.slice(0, 1200)}`);
  }
  bump("rejected");
  logRejected({ title: srcItems[0].title, url: srcItems[0].url, kind: pick.kind, fails: lastFails });
  return null;
}


/** Tekrarlayan seri postu: web aramasıyla veri -> tablo slaytları -> süzgeç -> foto -> iki doğrulayıcı (bir kez yeniden deneme). */
async function publishSeries({ s, key, ctx }) {
  log(`Seri: ${s.id} (${key})`);
  state.series ??= {};
  const st = (state.series[key] ??= { tries: 0 });
  st.tries++; bump("drafts"); saveState();
  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const w = s.static ? { post: s.build(ctx), sourceUrls: [] } : await writeSeries({ s, ctx }, feedback);
    if (!w) { log("Seri: yeterli doğrulanmış veri yok."); return false; }
    const sourceName = w.post.primarySource;
    const g = guardPost(w.post, { sourceName });
    if (!g.ok) { log("Seri süzgeçten geçmedi:", g.reason); feedback = g.reason; continue; }
    const photos = await findImages(g.post.imageQueries ?? s.imageQueries, Math.min(g.post.slides.length, 3), s.cat ?? "genel", usedPhotos);
    if (!photos.length) { log("Seri: foto yok."); return false; }
    // Statik seri (haftanın sorusu): olgu iddiası yok, doğrulayıcıya gerek yok
    const gate = s.static ? { ok: true, fails: [] } : await verifyGate(g.post, { sourceUrls: w.sourceUrls, photos, sourceName, referenceData: w.referenceData ?? "", rowEvidence: w.post.evidence, budget: { webSearch: 6, webFetch: 16 }, skipItems: ["kaynak_satiri"] });
    if (gate.ok) {
      bump("approved");
      const res = await renderAndPublish({ post: g.post, photos }, { category: s.cat ?? "genel", sourceName, ids: [`seri:${key}`], kind: "seri", title: g.post.slides[0]?.title, srcUrls: w.sourceUrls, onPublished: (r) => { st.done = true; st.media = r.id; saveState(); } });
      if (res && !DRY) { st.done = true; st.media = res.id; saveState(); }
      return !!res;
    }
    feedback = failText(gate.fails);
    log(`Seri doğrulaması düştü (deneme ${attempt}):
${feedback.slice(0, 1200)}`);
  }
  bump("rejected");
  logRejected({ title: key, url: "seri", kind: "seri", fails: [{ model: "-", item: "seri", note: feedback.slice(0, 500) }] });
  saveState();
  return false;
}

/** Görselleri üretir, (dry değilse) yükleyip paylaşır, state'e yazar. Paylaşım sonucunu döner. */
/** Elle yeniden paylaşım: "URL | kategori | kaynak adı | başlık". Tam hat (yazar, editör, süzgeç, foto, doğrulama) çalışır. */
async function repostOne(spec) {
  // İlk alan birden çok URL olabilir (boşluk ya da virgülle): hepsi kaynak olarak yazara verilir
  const [links, category = "genel", srcName = "", title = ""] = String(spec).split("|").map((x) => x.trim());
  const list = links.split(/[\s,]+/).filter((u) => /^https:\/\//.test(u)).slice(0, 3);
  if (!list.length) { log("Yeniden paylaşım: geçersiz URL."); return; }
  const items = [];
  for (const link of list) {
    const url = await resolveNewsUrl(link);
    const text = await articleText(url);
    const host = new URL(url).hostname.replace(/^www\./, "");
    items.push({ id: link, url, title: title || text.slice(0, 120), source: items.length ? host : (srcName || host), text });
  }
  const sourceName = items[0].source;
  const pick = { ids: items.map((i) => i.id), score: 10, category, kind: "haber", format: "carousel", why: "elle yeniden paylaşım" };
  const ready = await prepareVerified(pick, items, sourceName);
  if (!ready) { await notify(`⚠️ Hibrit Portal: yeniden paylaşım doğrulamadan geçmedi (${title || items[0].url}).`); return; }
  const res = await renderAndPublish(ready, { category, sourceName: ready.sourceName ?? sourceName, ids: pick.ids, kind: "haber", title: items[0].title, srcUrls: items.map((i) => i.url) });
  if (res) log("Yeniden paylaşıldı:", res.permalink ?? res.id);
}

async function pickPhotos({ post, pages, topic, want, category }) {
  // Etkinlik fotoğrafları önceki postlarda kullanılmış olabilir (aynı etkinliğin takip/hikaye postu): tekrar kullanılabilir
  const ev = await eventPhotos({ pages, instagram: post.officialInstagram, topic, n: want, eventName: post.eventName })
    .catch((e) => { if (isCreditError(e)) throw e; log("Etkinlik fotoğrafı hatası:", String(e?.message ?? e).slice(0, 160)); return []; });
  if (ev.length) log(`Etkinlik fotoğrafı: ${ev.length} (${[...new Set(ev.map((p) => p.source))].join(", ")})`);
  // Belirli bir etkinlikten bahseden postta o etkinliğin fotoğrafı varsa YALNIZCA onlar kullanılır (slaytlarda sırayla tekrar eder).
  // Hiç bulunamazsa konuyla ilgili (görsel denetimden geçmiş) stok fotoğrafa düşülür.
  if (post.eventName) {
    const own = ev.filter((p) => p.specific);
    if (own.length) return own;
    log(`Etkinliğe ait fotoğraf bulunamadı (${post.eventName}); konuyla ilgili stok fotoğraf kullanılacak.`);
  }
  const need = want - ev.length;
  if (need <= 0) return ev;
  const cands = await findImages(post.imageQueries ?? [], need + 3, category, new Set([...usedPhotos, ...ev.map((p) => p.id)]));
  const stock = (await screenPhotos(cands, topic, "stock")).slice(0, need);
  if (cands.length > stock.length) log(`Görsel denetim: ${cands.length - stock.length} stok foto konuyla ilgisiz bulundu, kullanılmadı.`);
  return [...ev, ...stock];
}

async function renderAndPublish({ post, photos }, { category, sourceName, ids, kind, title, srcUrls = [], onPublished = null }) {
  const slug = `${today}/${Date.now().toString(36)}`;
  const outDir = path.join("out", slug);
  // Etkinlik logosu: önce circle21 resmî kaydındaki yarış logosu, sonra resmî site, sonra resmî Instagram profil fotoğrafı
  const eventLogo = (post.eventLogoUrl ? await logoFromUrl(post.eventLogoUrl).catch(() => null) : null)
    ?? (post.officialSite ? await fetchEventLogo(post.officialSite).catch(() => null) : null)
    ?? (post.officialInstagram ? await fetchInstagramLogo(post.officialInstagram).catch(() => null) : null);
  if (eventLogo) log("Etkinlik logosu:", eventLogo.source);
  const files = await renderPost({ ...post, photos, eventLogo, category, source: sourceName, dateLabel }, outDir);
  // guard: temizlenmiş metin + "Kaynak: ..." + hashtag; foto kredisi Kaynak satırının altına eklenir
  // Yalnızca sabit sağlayıcı adı yazılır (fotoğrafçı adı dış kaynaktan gelir, caption'a girmez; görselde kalır)
  // Foto kredisi yazılmaz: yalnızca atıf gerektirmeyen fotoğraflar kullanılır (Pexels lisansı, Openverse'te CC0 / kamu malı)
  // Etkinliğin kendi fotoğrafı kullanıldıysa kaynağı açıklamada belirtilir (görselde yazı yok)
  const evSrc = [...new Set(photos.filter((p) => String(p.id).startsWith("event:")).map((p) => p.source))];
  const caption = evSrc.length && /Kaynak:[^\n]*/.test(post.caption) ? post.caption.replace(/(Kaynak:[^\n]*)/, `$1\nGörsel: ${evSrc.join(", ")}`) : post.caption;
  fs.writeFileSync(path.join(outDir, "caption.txt"), `${caption}\n\n---\n${srcUrls.join("\n")}\n`);
  log(`Üretildi: ${outDir} (${files.length} slayt)`);
  if (DRY) { log(`Caption:\n${caption}`); return null; }
  const urls = await uploadFiles(files, slug);
  const res = await publish(urls, caption);
  state.posts.push({ day: today, ids, kind, photos: photos.map((p) => p.id), media: res.id, permalink: res.permalink, cover: urls[0], title, headline: post.slides[0]?.title, eventName: post.eventName || undefined, at: new Date().toISOString() });
  for (const id of ids ?? []) postedIds.add(id);
  for (const p of photos) if (!String(p.id).startsWith("local:")) usedPhotos.add(p.id);
  saveState(); // paylaşım hemen kalıcı: sonraki adım çökse de aynı haber tekrar paylaşılmaz
  // Çağıranın tamamlanma işareti (seri done / takip "paylaşıldı") hikâye adımından ÖNCE yazılır: zaman aşımında tekrar yayın olmasın
  if (onPublished) { try { onPublished(res); } catch (e) { log("Tamamlanma işareti yazılamadı:", e.message); } }
  log("Yayında:", res.permalink);
  await notify(`✅ Paylaşıldı (${kind})\n${post.slides[0]?.title}\n${res.permalink}`);
  // Hikâye: kapak 9:16 karta alınır ve Story olarak paylaşılır (erişim için). Hata ana postu etkilemez.
  if (POSTING.stories !== false) {
    try {
      const sf = await renderStory(files[0], path.join(outDir, "story.jpg"));
      const [su] = await uploadFiles([sf], `${slug}/story`);
      const st = await publishStory(su);
      const rec = state.posts.find((p) => p.media === res.id);
      if (rec) rec.story = st.id;
      saveState();
      log("Hikâye yayında:", st.id);
    } catch (e) { log("Hikâye paylaşılamadı (post yayında):", String(e.message).slice(0, 300)); }
  }
  return res;
}

/** Vadesi gelmiş takip postunu (geçmiş edisyonlar / geçmiş antrenmanlar) hazırlar ve paylaşır. */
async function publishFollowup() {
  if (!budgetLeft()) { log("Zaman bütçesi doldu, takip postu denenmiyor."); return false; }
  if (draftCapReached()) { log(`Günlük taslak tavanı dolu (${MAX_DRAFTS_PER_DAY}), takip postu yok.`); return false; }
  let fu = null;
  try {
    fu = dueFollowup(today);
    if (!fu) return false;
    log(`Takip postu: ${fu.eventName} / ${fu.type}`);
    const { pick, sources } = followupInput(fu);
    const ready = await prepareVerified(pick, sources, "Hibrit Portal arşivi");
    if (!ready) { if (!DRY) markFollowup(fu, "reddedildi"); return false; }
    const res = await renderAndPublish(ready, { category: pick.category, sourceName: ready.sourceName, ids: [sources[0].id], kind: "takip", title: sources[0].title, srcUrls: [sources[0].url], onPublished: () => markFollowup(fu, "paylaşıldı") });
    if (!DRY) markFollowup(fu, res ? "paylaşıldı" : "hata");
    return Boolean(res) || DRY;
  } catch (e) {
    if (isCreditError(e)) throw e; // kredi bitti: üst seviyede duraklat
    console.error(e);
    log("Takip postu hatası:", e.message);
    if (fu && !DRY) { try { markFollowup(fu, "hata"); } catch (e2) { log("Takip durumu yazılamadı:", e2.message); } }
    await notify(`⚠️ Hibrit Portal: takip postu başarısız:\n${String(e.message).slice(0, 500)}`);
    return false;
  }
}

/** Tanıtım postu: hesabın ilk paylaşımı (elle yazılmış metin, marka kiti görseli). */
async function publishIntro() {
  // Yol benzersiz: aynı yola ikinci yükleme raw CDN önbelleğinden ESKİ görseli döndürebilir
  const urls = await uploadFiles(INTRO_IMAGES, `${today}/tanitim-${Date.now().toString(36)}`);
  const res = await publish(urls, INTRO_CAPTION);
  state.intro = { media: res.id, permalink: res.permalink, at: new Date().toISOString() };
  state.posts.push({ day: today, ids: ["intro"], kind: "tanitim", photos: [], media: res.id, permalink: res.permalink, cover: urls[0], title: "Hibrit Portal yayında", at: new Date().toISOString() });
  saveState();
  log("Tanıtım postu yayında:", res.permalink);
  await notify(`✅ Tanıtım postu paylaşıldı
${res.permalink}`);
}

/** Stok kuyruğundaki ilk postu görselleriyle üretir ve paylaşır. 2 başarısız denemeden sonra öğe kuyruktan çıkarılır. */
async function publishStock() {
  if (!budgetLeft()) { log("Zaman bütçesi doldu, stok denenmiyor."); return; }
  let st;
  try { st = loadStock(); } catch (e) {
    log("Stok okunamadı:", e.message);
    await notify(`⚠️ Hibrit Portal: ${e.message}`);
    return;
  }
  const item = st.queue[0];
  if (!item) { log("Stok boş, bugün paylaşım yok."); return; }
  const failAttempt = async (why) => {
    log(`Stok paylaşılamadı (${item.topic}): ${why}`);
    if (DRY) return;
    item.attempts = (item.attempts ?? 0) + 1;
    item.lastError = String(why).slice(0, 300);
    if (item.attempts >= STOCK_MAX_ATTEMPTS) {
      st.queue.shift();
      st.dropped = [...(st.dropped ?? []), { ...item, post: undefined, droppedAt: new Date().toISOString() }].slice(-20);
      log(`Stok öğesi ${STOCK_MAX_ATTEMPTS} denemede paylaşılamadı, kuyruktan çıkarıldı: ${item.topic}`);
    }
    saveStock(st);
    await notify(`⚠️ Hibrit Portal: stok post paylaşılamadı (${item.topic}, deneme ${item.attempts}):\n${String(why).slice(0, 400)}`);
  };
  try {
    const post = item.post;
    const slug = `${today}/stok-${Date.now().toString(36)}`;
    const outDir = path.join("out", slug);
    const photos = await findImages(post.imageQueries ?? [], Math.min(post.slides.length, 4), item.category, usedPhotos);
    if (!photos.length) return await failAttempt("foto bulunamadı");
    const files = await renderPost({ ...post, photos, category: item.category, source: item.sourceName, dateLabel }, outDir);
    fs.writeFileSync(path.join(outDir, "caption.txt"), `${post.caption}\n`);
    log(`Stok üretildi: ${item.topic} -> ${outDir} (${files.length} slayt)`);
    if (DRY) { log(`Caption:\n${post.caption}`); return; }
    const urls = await uploadFiles(files, slug);
    const res = await publish(urls, post.caption);
    // Paylaşım hemen kalıcı: önce posted.json, sonra kuyruk
    state.posts.push({ day: today, ids: [item.id], kind: "stok", photos: photos.map((p) => p.id), media: res.id, permalink: res.permalink, cover: urls[0], title: post.slides[0]?.title, headline: post.slides[0]?.title, at: new Date().toISOString() });
    saveState();
    st.queue.shift();
    saveStock(st);
    log("Stok yayında:", res.permalink);
    await notify(`✅ Stok post paylaşıldı\n${post.slides[0]?.title}\n${res.permalink}`);
  } catch (e) {
    if (isCreditError(e)) throw e; // kredi bitti: üst seviyede duraklat
    console.error(e);
    await failAttempt(e.message);
  }
}

try {
  const r = await main();
  // Günlük özet: son çalışmada (21:30) log + bildirim; gecikmeli/yedek çalışmada ikinci kez gönderilmez.
  // hour >= 21: 20:10 yedeği ve 20:xx'e kayan 19:30 özeti erken göndermez; 22:10 yedeği yalnızca 21:30 düştüyse gönderir.
  const d = state.daily?.[today];
  if (r !== SKIPPED && !DRY && hour >= 21 && d && !d.summarySent) {
    const done = state.posts.filter((p) => p.day === today && p.media);
    let rej = [];
    try { rej = JSON.parse(fs.readFileSync("state/rejected.json", "utf8")).filter((r) => String(r.at ?? "").slice(0, 10) === new Date().toISOString().slice(0, 10)); } catch {}
    const msg = [
      `📊 Günlük özet ${today}: ${done.length} paylaşım, ${d.drafts} taslak, ${d.approved} onay, ${d.rejected} red.`,
      done.length ? "\nPaylaşılanlar:\n" + done.map((p) => `- ${p.headline ?? p.title ?? p.kind} (${p.kind}) ${p.permalink ?? ""}`).join("\n") : "\nBugün paylaşım yok.",
      rej.length ? "\nElenen taslaklar:\n" + rej.slice(-8).map((r) => `- ${String(r.title ?? "").slice(0, 90)}: ${(r.fails ?? []).slice(0, 2).map((f) => `${f.item}`).join(", ")}`).join("\n") : "",
    ].join("\n");
    log(msg);
    await notify(msg);
    d.summarySent = true;
    saveState();
  }
  // Sağlık alarmı: 48 saattir hiç paylaşım yoksa (hiç paylaşım olmadıysa: ilk canlı çalışmadan bu yana) iş "başarısız" biter,
  // GitHub hesap sahibine e-posta atar.
  if (r !== SKIPPED && !DRY) {
    const last = state.posts.filter((p) => p.media && p.at).map((p) => p.at).sort().pop();
    const ref = last ?? state.deployedAt;
    if (ref && Date.now() - new Date(ref).getTime() > 48 * 36e5) {
      const what = last ? `son paylaşım: ${last}` : `hiç paylaşım yok, ilk çalışma: ${state.deployedAt}`;
      console.error(`UYARI: 48 saattir paylaşım yok (${what}), kontrol gerekli.`);
      await notify(`⚠️ Hibrit Portal: 48 saattir paylaşım yok (${what}).`);
      process.exitCode = 1;
    }
  }
} catch (e) {
  console.error(e);
  if (isCreditError(e) && !DRY) {
    if (state.paused?.reason !== "kredi") {
      state.paused = { reason: "kredi", at: new Date().toISOString() };
      try { saveState(); } catch {}
      await notify("⚠️ Hibrit Portal: Anthropic API kredisi bitti. Bot ücretli işlemleri durdurdu; HİÇBİR ödeme yapılmadı. Kredi yüklenince bot bir sonraki saatlik çalışmada kendiliğinden devam eder.");
    }
    process.exitCode = 0;
  } else {
    await notify(`⚠️ Hibrit Portal bot hatası:\n${e.message}`);
  }
  process.exitCode = 1;
} finally {
  // Son kayıt (dry'da yazılmaz). 60 günden eski kayıtlar saveState içinde budanır.
  try { saveState(); } catch (e) { console.error("Durum yazılamadı:", e); process.exitCode = 1; }
}
