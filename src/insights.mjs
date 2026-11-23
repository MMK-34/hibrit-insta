// Etkileşim verisi (kullanıcı isteği 2026-11-24): yayınlanan postların erişim, beğeni, yorum, kaydetme, paylaşım
// ve (Reels için) izlenme sayıları günde bir kez Instagram'dan çekilip state/posted.json'a (post.ins) yazılır.
// Amaç: hangi içerik türü, konu ve saatin işe yaradığını tahminle değil veriyle görmek. Yalnızca okuma yapar.
import { mediaInsights } from "./publish.mjs";

const H = 36e5;

/** 20 saatten eski, 8 günden yeni postların verisini günde bir kez günceller (çalışma başına en çok `max`). */
export async function collectInsights(state, { max = 40 } = {}) {
  const now = Date.now();
  let n = 0, err = "";
  for (const p of state.posts ?? []) {
    if (!p.media || n >= max) continue;
    const age = now - Date.parse(p.at ?? 0);
    if (!(age > 20 * H && age < 8 * 24 * H)) continue;
    if (p.ins?.at && now - Date.parse(p.ins.at) < 20 * H) continue;
    try {
      p.ins = { at: new Date().toISOString(), ...(await mediaInsights(p.media, p.kind === "reel")) };
      n++;
    } catch (e) {
      err = String(e?.message ?? e).slice(0, 300);
      break; // izin/token sorunu: kalan postlar için de aynı hata gelir
    }
  }
  return { n, err };
}

const score = (i) => (i.saved ?? 0) * 3 + (i.shares ?? 0) * 3 + (i.comments ?? 0) * 2 + (i.likes ?? 0);
const avg = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0);
const trHour = (iso) => Number(new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", hour12: false })) % 24;

/** Son 7 günün özeti: en iyi 3 post, tür ve saat dilimine göre ortalama erişim (veya erişim yoksa etkileşim). Veri yoksa boş döner. */
export function weeklySummary(state) {
  const since = Date.now() - 7 * 24 * H;
  const rows = (state.posts ?? []).filter((p) => p.media && p.ins && Date.parse(p.at ?? 0) > since);
  if (rows.length < 3) return "";
  const top = [...rows].sort((a, b) => score(b.ins) - score(a.ins)).slice(0, 3)
    .map((p, i) => `${i + 1}. ${String(p.headline ?? p.title ?? "").slice(0, 70)} — erişim ${p.ins.reach ?? "?"}, beğeni ${p.ins.likes ?? "?"}, kaydetme ${p.ins.saved ?? "?"}, paylaşım ${p.ins.shares ?? "?"}`);
  const hasReach = rows.some((p) => typeof p.ins.reach === "number");
  const metricLabel = hasReach ? "ortalama erişim" : "ortalama beğeni+yorum";
  const metricVal = (p) => (hasReach ? (p.ins.reach ?? 0) : (p.ins.likes ?? 0) + (p.ins.comments ?? 0));
  const by = (key) => {
    const m = {};
    for (const p of rows) { const k = key(p); (m[k] ??= []).push(metricVal(p)); }
    return Object.entries(m).sort((a, b) => avg(b[1]) - avg(a[1])).map(([k, v]) => `${k}: ${avg(v)} (${v.length} post)`).join(" · ");
  };
  const slot = (p) => { const h = trHour(p.at); return h < 12 ? "sabah" : h < 17 ? "öğlen" : "akşam"; };
  return [
    `📈 Haftalık etkileşim özeti (${rows.length} post)`,
    "En iyi 3 post (kaydetme ve paylaşım ağırlıklı):", ...top,
    `Türe göre ${metricLabel}: ${by((p) => p.kind ?? "haber")}`,
    `Saate göre ${metricLabel}: ${by(slot)}`,
  ].join("\n");
}
