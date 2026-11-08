// circle21: CrossFit / fonksiyonel fitness yarışlarının resmî kayıt platformu (circle21.events). Herkese açık API.
// Türkiye'deki yarışların RESMÎ adı, başlangıç/bitiş tarihleri, kayıt tarihleri, ücret, adres ve organizatör Instagram'ı buradan alınır.
// İki kullanım:
//  1) circle21Candidates(): yeni duyurulan ya da kaydı kapanmak üzere olan Türkiye yarışları haber adayı olur.
//  2) circle21Reference(text): bir haber Türkiye'deki bir yarıştan bahsediyorsa eşleşen resmî kayıt yazara ve doğrulayıcıya verilir
//     (ör. "Kuşadası'nda CrossFit şampiyonası" haberi = ALSANCAK TEAM SERIES 2026).
import { safeGet } from "./safe-net.mjs";

const API = "https://api.circle21.events/api/competition";
const COUNTRIES = new Set(["TR", "CY"]);
const UA = "Mozilla/5.0 (compatible; hibrit-portal-news/1.0)";

const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric" }) : "");

async function page(params) {
  try {
    const r = await safeGet(`${API}?${params}&public=1&published=1`, { timeout: 25000, maxBytes: 12e6, headers: { "user-agent": UA, accept: "application/json" }, allowHttp: false });
    if (!r?.ok) return [];
    return JSON.parse(r.buf.toString("utf8"))?.data ?? [];
  } catch { return []; }
}

let cache = null;
/** Türkiye (ve KKTC) yarışları: yaklaşan + canlı + son bitenler. Tek çalışmada bir kez çekilir. */
export async function circle21Events() {
  if (cache) return cache;
  const lists = await Promise.all([page("upcoming=1&page=1&per_page=200"), page("live=1&page=1&per_page=100"), page("finished=1&page=1&per_page=100")]);
  const seen = new Set();
  cache = lists.flat().filter((d) => d && COUNTRIES.has(d.country) && !seen.has(d.id) && seen.add(d.id)).map((d) => ({
    id: d.id, name: String(d.name ?? "").replace(/\s+/g, " ").trim(), slug: d.slug,
    url: `https://circle21.events/events/${d.slug}`,
    start: d.date_from, end: d.date_to, regFrom: d.registration_from, regTo: d.registration_to,
    fee: d.entry_fee_value ? `${Number(d.entry_fee_value)} ${d.entry_fee_currency ?? ""}`.trim() : "",
    address: strip(d.competition_address), instagram: d.instagram ?? "", website: d.website ?? "",
    organizer: strip(d.organized_by).slice(0, 400), info: strip(d.info).slice(0, 2500),
    published: d.published_at ?? d.created_at, onsite: !!d.onsite, country: d.country,
  }));
  return cache;
}

/** Resmî kayıt metni (yazar ve doğrulayıcı için güvenilir veri). Kategori listesi bilerek verilmez (bkz. yazar kuralı). */
export function c21Text(e) {
  return [
    `Resmî ad: ${e.name}`,
    `Yarış tarihleri: ${day(e.start)} - ${day(e.end)}`,
    e.regFrom || e.regTo ? `Kayıt dönemi: ${day(e.regFrom)} - ${day(e.regTo)}` : "",
    e.fee ? `Kayıt ücreti: ${e.fee}` : "",
    e.address ? `Adres: ${e.address}` : "",
    e.onsite ? "Biçim: yüz yüze (on-site)" : "Biçim: çevrim içi",
    e.instagram ? `Resmî Instagram: ${e.instagram}` : "",
    e.website ? `Web sitesi: ${e.website}` : "",
    e.organizer ? `Organizatör: ${e.organizer}` : "",
    e.info ? `Açıklama: ${e.info}` : "",
    `Kayıt sayfası: ${e.url}`,
  ].filter(Boolean).join("\n");
}

const norm = (s) => String(s ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
const STOP = new Set(["2025", "2026", "2027", "the", "games", "series", "team", "crossfit", "challenge", "cup", "throwdown", "hyrox", "style", "and"]);

/**
 * Haber metniyle eşleşen circle21 yarışı (tarih penceresi ±25 gün; şehir ya da adın ayırt edici kelimesi metinde geçmeli).
 * Döner: { event, text } ya da null.
 */
export async function circle21Reference(text) {
  const t = norm(text);
  if (!t) return null;
  const now = Date.now();
  let best = null;
  for (const e of await circle21Events()) {
    const s = Date.parse(e.start ?? 0), en = Date.parse(e.end ?? e.start ?? 0);
    if (!(s - 25 * 864e5 <= now + 60 * 864e5 && en + 25 * 864e5 >= now)) continue;
    let score = 0;
    const words = norm(e.name).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w));
    if (words.some((w) => t.includes(w))) score += 2;
    // Adresteki ilçe/il ("09400 Kuşadası/Aydın")
    const place = (e.address.match(/\d{5}\s+([^/,]+)\/([^,]+)/) ?? []).slice(1).map((x) => norm(x.trim())).filter((x) => x.length > 3);
    if (place.some((p) => t.includes(p))) score += 1;
    if (/crossfit|fonksiyonel|hyrox|hibrit|yarisma|sampiyona/.test(t)) score += 0.5;
    if (score >= 1.5 && (!best || score > best.score)) best = { score, event: e };
  }
  return best ? { event: best.event, text: c21Text(best.event) } : null;
}

/** Haber adayları: son 10 günde yayımlanan yeni yarışlar (duyuru) ve kaydı 7 gün içinde kapanacak yarışlar. */
export async function circle21Candidates() {
  const now = Date.now();
  const out = [];
  for (const e of await circle21Events()) {
    const start = Date.parse(e.start ?? 0);
    if (!(start > now)) continue;
    const pub = Date.parse(e.published ?? 0), regTo = Date.parse(e.regTo ?? 0);
    const base = {
      eventName: e.name, url: e.url, source: "circle21 resmî kayıt sayfası", feedCat: "crossfit", date: new Date().toISOString(), ageH: 0,
      snippet: c21Text(e).slice(0, 1500), text: c21Text(e),
    };
    if (now - pub < 10 * 864e5) out.push({ ...base, id: `c21:${e.id}`, title: `Yeni yarış duyurusu (resmî kayıt platformu): ${e.name}, ${day(e.start)}` });
    else if (regTo > now && regTo - now < 7 * 864e5) out.push({ ...base, id: `c21son:${e.id}`, title: `Kayıtlar ${day(e.regTo)} tarihinde kapanıyor: ${e.name}, yarış ${day(e.start)}` });
  }
  return out;
}
