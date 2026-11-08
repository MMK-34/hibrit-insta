// Geri sayım hikâyeleri: YALNIZCA büyük yarışlar için (kullanıcı kararı: küçük/salon yarışları yok; tarafsız haber kanalı).
// "HYROX İstanbul'a 7 gün", "Eurasia Throwdown kayıtlarının kapanmasına 3 gün" gibi 9:16 kart, hikâye olarak paylaşılır.
// Tarihler yalnızca yapılandırılmış kaynaklardan: sitenin yarış takvimi (cal/src/data/calendar.json, durumu "confirmed")
// ve circle21 resmî kayıtları. Model üretimi tarih yok.
import fs from "node:fs";
import { circle21Events } from "./circle21.mjs";

// Büyük yarışlar (elle seçilmiş). Yalnızca bu adlarla eşleşen yarışlara geri sayım yapılır.
export const BIG_RACES = [
  /\bHYROX\b.*(İstanbul|Istanbul|İzmir|Izmir|Antalya|Ankara|World Championships?|Dünya Şampiyonası)/i,
  /Eurasia Throwdown/i,
  /Alsancak Team Series/i,
  /Battle of Anatolia/i,
  /İstanbul Maratonu|Istanbul Marathon|İstanbul Yarı Maratonu|Istanbul Half Marathon/i,
  /Runtalya/i,
  /Cappadocia Ultra[- ]?Trail|Kapadokya Ultra/i,
  /Kaçkar by UTMB|Kackar by UTMB/i,
  /Uludağ Premium Ultra|Uludag Premium Ultra/i,
  /Lycian Way Ultra|Likya Yolu Ultra/i,
  /Bodrum Yarı Maratonu|Bodrum Half Marathon/i,
  /CrossFit Open/i,
  /CrossFit Games\b/i,
  /Athens Throwdown|Tirana Throwdown|Belgrade Games/i,
];
const isBig = (name) => BIG_RACES.some((re) => re.test(String(name ?? "")));

// Yarış başlangıcına ve kayıt kapanışına kalan gün eşikleri
const START_DAYS = [30, 14, 7, 3, 1];
const REG_DAYS = [7, 3, 1];

const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const trDate = (iso) => { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`); return `${d.getUTCDate()} ${AY[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
// İstanbul'a göre bugünden o tarihe kalan gün
function daysUntil(iso) {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((d - t0) / 864e5);
}
const norm = (s) => String(s ?? "").toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşöçı]+/g, " ").trim();

/** Bugün eşiğe denk gelen geri sayımlar. Döner: [{ key, kicker, number, title, date, place, logoUrl }] */
export async function countdownsDue() {
  const races = [];
  try {
    const cal = JSON.parse(fs.readFileSync(new URL("../cal/src/data/calendar.json", import.meta.url), "utf8"));
    for (const e of cal.items ?? []) {
      if (e.status !== "confirmed" || !isBig(e.name) || !e.startDate) continue;
      races.push({ name: e.name, start: e.startDate, regTo: e.registration?.to ?? "", place: e.city ?? "", logoUrl: /^https:\/\//.test(e.logo ?? "") ? e.logo : "" });
    }
  } catch { /* takvim yoksa yalnızca circle21 */ }
  for (const e of await circle21Events().catch(() => [])) {
    if (!isBig(e.name) || !e.start) continue;
    const city = (e.address.match(/\d{5}\s+([^/,]+)\//) ?? [])[1]?.trim() ?? "";
    races.push({ name: e.name, start: e.start.slice(0, 10), regTo: (e.regTo ?? "").slice(0, 10), place: city, logoUrl: e.logo || "" });
  }
  // Aynı yarış iki kaynakta: ad + başlangıç tarihine göre tekilleştir
  const seen = new Set(), out = [];
  for (const r of races) {
    const id = `${norm(r.name)}|${r.start}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const ds = daysUntil(r.start);
    // Takvimde "Ad — kayıt açılışı / online qualifier / Final" biçiminde aşama kayıtları var: yazı aşamaya göre seçilir
    const [base, stage = ""] = String(r.name).split(/\s+[—–-]\s+/);
    const title = base.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const kicker = /kayıt açılış|registration open/i.test(stage) ? "Kayıtların açılmasına"
      : /qualifier|eleme/i.test(stage) ? "Online elemeye"
      : /CrossFit Open/i.test(title) ? "Open'ın başlamasına"
      : "Yarışa";
    if (START_DAYS.includes(ds)) out.push({ key: `cd:${id}:start:${ds}`, kicker, number: ds, title, date: trDate(r.start), place: r.place, logoUrl: r.logoUrl });
    if (r.regTo) {
      const dr = daysUntil(r.regTo);
      if (REG_DAYS.includes(dr)) out.push({ key: `cd:${id}:reg:${dr}`, kicker: "Kayıtların kapanmasına", number: dr, title, date: `Son kayıt: ${trDate(r.regTo)}`, place: r.place, logoUrl: r.logoUrl });
    }
  }
  return out;
}
