// Veri/istatistik postları: sayılar KODLA hesaplanır (LLM yok, ağ yok).
// Kaynak: cal/src/data/events/*.json (yarışma arşivi) + cal/src/data/calendar.json (takvim).
// Aynı veri dosyalarıyla her çalıştırmada birebir aynı çıktı üretilir: "bugün" yerine
// referans tarih olarak calendar.json'daki `updated` alanı kullanılır.
import fs from "node:fs";

const DATA = new URL("../cal/src/data/", import.meta.url);
const SOURCE_NAME = "Hibrit Portal yarışma arşivi";
const MAX_ROWS = 7;

// ---------- yükleme ----------
function loadEvents() {
  const dir = new URL("events/", DATA);
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .map((f) => ({ slug: f.replace(/\.json$/, ""), ...JSON.parse(fs.readFileSync(new URL(f, dir), "utf8")) }));
}
function loadCalendar() {
  return JSON.parse(fs.readFileSync(new URL("calendar.json", DATA), "utf8"));
}

// ---------- yardımcılar ----------
const TR = "Türkiye";
const isHttps = (u) => typeof u === "string" && /^https:\/\//.test(u);
const fmt = (n) => String(n);
const fmt1 = (x) => (Math.round(x * 100) / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const pct = (a, b) => (b ? `%${Math.round((a / b) * 100)}` : "%0");
const days = (s, e) => Math.round((Date.parse(e) - Date.parse(s)) / 864e5) + 1;
const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const AYLAR_UZUN = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** Sık görülen öğeler önde, sonra ilk görülme sırası; en fazla n adet https URL */
function topUrls(list, n = 6) {
  const m = new Map();
  list.forEach((u, i) => { if (!isHttps(u)) return; const v = m.get(u) ?? { c: 0, i }; v.c++; m.set(u, v); });
  return [...m.entries()].sort((a, b) => b[1].c - a[1].c || a[1].i - b[1].i).slice(0, n).map(([u]) => u);
}

/** Önce resmi siteler (event.website), sonra kaynak sayfaları; hayran veritabanı / video linkleri en sona */
const LOW = /baserank|youtube.com|youtu.be/;
function officialUrls(websites, others, n = 6) {
  const a = topUrls(websites, n), b = topUrls(others.filter((u) => !LOW.test(u ?? "")), n), c = topUrls(others.filter((u) => LOW.test(u ?? "")), n);
  return [...new Set([...a, ...b, ...c])].slice(0, n);
}

/** Ülke adlarını tek biçime getir (takvimde İngilizce/Türkçe karışık) */
const COUNTRY = {
  "Spain": "İspanya", "Espanha": "İspanya", "Germany": "Almanya", "United States": "ABD", "USA": "ABD",
  "United Kingdom": "Birleşik Krallık", "İngiltere": "Birleşik Krallık", "İskoçya": "Birleşik Krallık", "Galler": "Birleşik Krallık",
  "United Arab Emirates": "BAE", "Brazil": "Brezilya", "Mexico": "Meksika", "France": "Fransa", "Ireland": "İrlanda",
  "Egypt": "Mısır", "South Korea": "Güney Kore", "Poland": "Polonya", "Italy": "İtalya", "Netherlands": "Hollanda",
};
const normCountry = (c) => COUNTRY[c] ?? c;
const NO_COUNTRY = new Set(["Dünya", "Açıklanmadı", undefined, null, ""]);

const TR_CITIES = ["Kuşadası", "İstanbul", "Ankara", "İzmir", "Antalya", "Samsun", "Bursa", "Eskişehir", "Bodrum", "Muğla", "Aydın", "Adana", "Konya", "Trabzon", "Mersin", "Denizli", "Kocaeli"];
/** Metindeki ilk Türkiye şehri (en erken geçen); yoksa null */
function findCity(text) {
  if (!text) return null;
  let best = null, pos = Infinity;
  for (const c of TR_CITIES) { const i = text.indexOf(c); if (i >= 0 && i < pos) { pos = i; best = c; } }
  return best;
}
/** Metinde birden fazla şehir varsa (ör. "Ankara / İstanbul") belirsiz say */
const multiCity = (text) => TR_CITIES.filter((c) => (text ?? "").includes(c)).length > 1 || /\//.test(text ?? "");

// ---------- veri hazırlığı ----------
function prepare() {
  const events = loadEvents();
  const cal = loadCalendar();
  const ref = String(cal.updated ?? "").slice(0, 10) || "2026-01-01";
  const refYear = Number(ref.slice(0, 4));

  // Yapılmış (referans tarihe kadar başlamış) edisyonlar. Tarihi olmayanlar: yılı referans yılından küçükse sayılır.
  const held = [];
  for (const e of events) for (const ed of e.editions ?? []) {
    const done = ed.startDate ? ed.startDate <= ref : Number(ed.year) < refYear;
    if (done) held.push({ e, ed });
  }
  const archiveKeys = new Set(events.flatMap((e) => (e.editions ?? []).filter((ed) => ed.startDate).map((ed) => `${e.slug}|${ed.startDate}`)));
  const upcoming = cal.items.filter((i) => (i.endDate ?? i.startDate) >= ref && !(i.eventSlug && archiveKeys.has(`${i.eventSlug}|${i.startDate}`)));
  return { events, cal, ref, refYear, held, upcoming };
}

// Takvim kalemi kaynağı: source bir URL ise o, değilse kalemin URL'sinin kökü (circle21.events, hyrox.com)
const calSourceUrl = (i) => (isHttps(i.source) ? i.source : isHttps(i.url) ? new URL(i.url).origin + "/" : null);
const refLabel = (ref) => { const [y, m, d] = ref.split("-").map(Number); return `${d} ${AYLAR_UZUN[m - 1]} ${y}`; };

// ---------- 1) Türkiye: yıllara göre yarışma sayısı ----------
function trByYear(D) {
  const tr = D.held.filter(({ e }) => e.country === TR);
  const years = tr.map(({ ed }) => Number(ed.year));
  const minY = Math.min(...years), maxY = D.refYear;
  // Tablo: son 7 yıl, her yıl ayrı satır (birleştirilmiş satır çubuk grafiği yanıltır); öncesi metinde
  const startY = Math.max(minY, maxY - MAX_ROWS + 1);
  const older = tr.filter(({ ed }) => Number(ed.year) < startY);
  const rows = [];
  for (let y = startY; y <= maxY; y++) {
    const xs = tr.filter(({ ed }) => Number(ed.year) === y);
    rows.push({ from: y, to: y, cf: xs.filter(({ e }) => e.type === "crossfit").length, hx: xs.filter(({ e }) => e.type === "hyrox").length });
  }
  const total = tr.length;
  const full = [2022, 2023, 2024, 2025].filter((y) => y < D.refYear);
  const fullN = tr.filter(({ ed }) => full.includes(Number(ed.year))).length;
  const avg = fullN / full.length;
  const curN = tr.filter(({ ed }) => Number(ed.year) === D.refYear).length;
  const nEvents = new Set(tr.map(({ e }) => e.slug)).size;
  const upTR = D.upcoming.filter((i) => i.country === TR);
  const restOfYear = upTR.filter((i) => i.startDate.slice(0, 4) === String(D.refYear));
  const undated = tr.filter(({ ed }) => !ed.startDate).map(({ e, ed }) => `${e.name} ${ed.year}`);
  const cfN = tr.filter(({ e }) => e.type === "crossfit").length, hxN = total - cfN;
  const firstHx = Math.min(...tr.filter(({ e }) => e.type === "hyrox").map(({ ed }) => Number(ed.year)));

  const lab = (r) => (r.from === r.to ? String(r.from) : `${r.from}–${r.to}`);
  return {
    id: "stat-tr-yillara-gore", cat: "genel",
    title: "Türkiye'de yılda kaç yarışma yapılıyor?",
    dataText: [
      `Kaynak: ${SOURCE_NAME} (cal/src/data/events). Referans tarih: ${D.ref}.`,
      `Yöntem: Türkiye'deki yarışmaların referans tarihe kadar yapılmış edisyonları yıl bazında sayıldı. Arşiv tam bir sayım DEĞİLDİR: büyük/öne çıkan yarışmaları kapsar; kutu (box) içi yerel yarışmaların çoğu arşivde yok, gerçek sayı daha yüksektir.`,
      `- Arşivde Türkiye'den ${nEvents} farklı yarışma, toplam ${total} edisyon var (${minY}–${maxY}).`,
      `- Tür dağılımı: CrossFit ${cfN} edisyon, HYROX ${hxN} edisyon. Arşivdeki ilk Türkiye HYROX'u ${firstHx} yılında.`,
      older.length ? `- ${startY} öncesi: ${older.length} edisyon (${older.map(({ e, ed }) => `${e.name} ${ed.year}`).join(", ")}). Tabloda gösterilmiyor.` : "",
      ...rows.map((r) => `- ${lab(r)}: CrossFit ${r.cf}, HYROX ${r.hx}, toplam ${r.cf + r.hx}`),
      `- ${full[0]}–${full[full.length - 1]} (${full.length} tam yıl) ortalaması: yılda ${fmt1(avg)} yarışma (arşivde kayıtlı olanlar).`,
      `- ${D.refYear} yılında referans tarihe kadar: ${curN} yarışma. Takvimde ${D.refYear} yılının kalanı için ${restOfYear.length} Türkiye yarışması daha var (${restOfYear.map((i) => `${i.name}${i.status === "expected" ? " [tarih tahmini]" : ""}`).join("; ")}).`,
      `- Takvimde referans tarihten sonrası için toplam ${upTR.length} Türkiye yarışması listeleniyor (${upTR.filter((i) => i.status === "expected").length} tanesinin tarihi tahmini).`,
      undated.length ? `- Tarihi kesin olmayan ama yılı bilinen edisyonlar sayıma dahil: ${undated.join(", ")}.` : "",
    ].filter(Boolean).join("\n"),
    table: {
      columns: ["Yıl", "CrossFit", "HYROX", "Toplam"],
      rows: rows.map((r) => [lab(r), fmt(r.cf), fmt(r.hx), fmt(r.cf + r.hx)]),
    },
    note: `${SOURCE_NAME}, ${startY}–${maxY} (${total - older.length} edisyon). Tam sayım değil.`,
    sourceName: SOURCE_NAME,
    sourceUrls: officialUrls(tr.map(({ e }) => e.website), tr.map(({ ed }) => ed.source)),
  };
}

// ---------- 2) Türkiye: şehirler ----------
function trCities(D) {
  const tr = D.held.filter(({ e }) => e.country === TR);
  const cityOfEd = ({ e, ed }) => {
    if (ed.venue && !multiCity(ed.venue)) return findCity(ed.venue) ?? "Belirsiz";
    if (!ed.startDate) return "Belirsiz"; // yeri/tarihi doğrulanmamış edisyon
    return multiCity(e.city) ? "Belirsiz" : findCity(e.city) ?? "Belirsiz";
  };
  const upTR = D.upcoming.filter((i) => i.country === TR);
  const cityOfCal = (i) => (multiCity(i.city) ? "Belirsiz" : findCity(i.city) ?? "Belirsiz");
  const m = new Map();
  const add = (city, k) => { const v = m.get(city) ?? { a: 0, t: 0 }; v[k]++; m.set(city, v); };
  tr.forEach((x) => add(cityOfEd(x), "a"));
  upTR.forEach((i) => add(cityOfCal(i), "t"));
  const all = [...m.entries()].map(([city, v]) => ({ city, ...v, n: v.a + v.t }));
  const unknown = all.find((r) => r.city === "Belirsiz") ?? { a: 0, t: 0, n: 0 };
  const known = all.filter((r) => r.city !== "Belirsiz").sort((a, b) => b.n - a.n || b.a - a.a || a.city.localeCompare(b.city, "tr"));
  const total = tr.length + upTR.length;
  const knownTotal = total - unknown.n;
  const top = known[0];
  const rows = known.slice(0, MAX_ROWS);
  return {
    id: "stat-tr-sehirler", cat: "genel",
    title: "Türkiye'de en çok yarışma yapılan şehirler",
    dataText: [
      `Kaynak: ${SOURCE_NAME} (geçmiş edisyonlar) + Hibrit Portal yarışma takvimi (yaklaşan yarışmalar). Referans tarih: ${D.ref}.`,
      `Yöntem: Her edisyonun şehri mekân (venue) bilgisinden alındı; mekân yoksa yarışmanın şehri kullanıldı. Yeri doğrulanmamış veya birden fazla şehir yazan ${unknown.n} kayıt "belirsiz" sayılıp sıralamadan çıkarıldı.`,
      `- Toplam ${total} kayıt: arşivde ${tr.length} yapılmış edisyon + takvimde ${upTR.length} yaklaşan yarışma (${upTR.filter((i) => i.status === "expected").length} tanesinin tarihi tahmini). Şehri belli olan: ${knownTotal}.`,
      ...known.map((r) => `- ${r.city}: ${r.n} (arşiv ${r.a}, takvim ${r.t}) — şehri belli kayıtların ${pct(r.n, knownTotal)}'i`),
      `- Lider: ${top.city}, ${knownTotal} kaydın ${top.n} tanesi (${pct(top.n, knownTotal)}).`,
      `Not: Arşiv tam bir sayım değildir; büyük yarışmaları kapsar.`,
    ].join("\n"),
    table: {
      columns: ["Şehir", "Geçmiş", "Yaklaşan", "Toplam"],
      rows: rows.map((r) => [r.city, fmt(r.a), fmt(r.t), fmt(r.n)]),
    },
    note: `Arşiv + takvim, ${knownTotal} kayıt (şehri belirsiz ${unknown.n} kayıt hariç).`,
    sourceName: SOURCE_NAME,
    sourceUrls: officialUrls(tr.map(({ e }) => e.website), [...tr.map(({ ed }) => ed.source), ...upTR.map(calSourceUrl)]),
  };
}

// ---------- 3) Takvim: ülkeler ----------
function calCountries(D) {
  const items = D.cal.items;
  const withC = items.filter((i) => !NO_COUNTRY.has(i.country));
  const m = new Map();
  for (const i of withC) {
    const c = normCountry(i.country);
    const v = m.get(c) ?? { cf: 0, hx: 0 };
    v[i.type === "hyrox" ? "hx" : "cf"]++;
    m.set(c, v);
  }
  const all = [...m.entries()].map(([c, v]) => ({ c, ...v, n: v.cf + v.hx })).sort((a, b) => b.n - a.n || a.c.localeCompare(b.c, "tr"));
  const rank = all.findIndex((r) => r.c === TR) + 1;
  let rows = all.slice(0, MAX_ROWS);
  if (rank > MAX_ROWS) rows = [...all.slice(0, MAX_ROWS - 1), all[rank - 1]];
  const months = items.map((i) => i.startDate.slice(0, 7)).sort();
  const c21 = items.filter((i) => i.source === "circle21");
  const c21uk = c21.filter((i) => normCountry(i.country) === "Birleşik Krallık").length;
  const [y0, m0] = months[0].split("-").map(Number), [y1, m1] = months[months.length - 1].split("-").map(Number);
  const span = `${AYLAR_UZUN[m0 - 1]} ${y0} – ${AYLAR_UZUN[m1 - 1]} ${y1}`;
  return {
    id: "stat-takvim-ulkeler", cat: "genel",
    title: "Yarışma takviminde en çok yarışma olan ülkeler",
    dataText: [
      `Kaynak: Hibrit Portal yarışma takvimi (cal/src/data/calendar.json, güncelleme ${D.ref}). Kapsam: ${span}.`,
      `Yöntem: Takvimdeki ${items.length} yarışma ülkelere göre sayıldı (İngilizce/Türkçe ülke adları birleştirildi; İngiltere, İskoçya ve Galler "Birleşik Krallık" altında). Online veya yeri açıklanmamış ${items.length - withC.length} kayıt hariç; kalan ${withC.length} kayıt, ${all.length} ülke.`,
      `- Tür: CrossFit ${items.filter((i) => i.type === "crossfit").length}, HYROX ${items.filter((i) => i.type === "hyrox").length} (HYROX simülasyon/HYROX tarzı yerel etkinlikler dahil).`,
      ...all.slice(0, 10).map((r) => `- ${r.c}: ${r.n} (CrossFit ${r.cf}, HYROX ${r.hx}) — ${pct(r.n, withC.length)}`),
      (() => { const t = all[rank - 1]; const above = all.filter((r) => r.n > t.n).length, same = all.filter((r) => r.n === t.n && r.c !== TR).map((r) => r.c); return `- Türkiye ${above + 1}. sırada${same.length ? ` (${same.join(", ")} ile eşit)` : ""}.`; })(),
      `Uyarı: CrossFit kayıtlarının çoğu circle21 yarışma platformundan geliyor (${c21.length} kayıt; bunların ${c21uk} tanesi Birleşik Krallık'ta). Bu yüzden sıralama "dünyada en çok yarışma olan ülke" değil, "takvimimizde en çok yer alan ülke" olarak okunmalı.`,
    ].join("\n"),
    table: {
      columns: ["Ülke", "CrossFit", "HYROX", "Toplam"],
      rows: rows.map((r) => [r.c, fmt(r.cf), fmt(r.hx), fmt(r.n)]),
      highlight: rows.map((r, i) => (r.c === TR ? i : -1)).filter((i) => i >= 0),
    },
    note: `Hibrit Portal takvimi, ${span}, ${withC.length} yarışma.`,
    sourceName: SOURCE_NAME,
    sourceUrls: topUrls(items.map(calSourceUrl)),
  };
}

// ---------- 4) Takvim: ay ay yoğunluk ----------
function calMonths(D) {
  const items = D.cal.items;
  const [ry, rm] = D.ref.split("-").map(Number);
  const keys = [];
  for (let k = 0; k < MAX_ROWS; k++) { const mm = (rm - 1 + k) % 12, yy = ry + Math.floor((rm - 1 + k) / 12); keys.push(`${yy}-${String(mm + 1).padStart(2, "0")}`); }
  const rows = keys.map((k) => {
    const xs = items.filter((i) => i.startDate.slice(0, 7) === k);
    const [y, m] = k.split("-").map(Number);
    return { k, label: `${AYLAR[m - 1]} ${y}`, long: `${AYLAR_UZUN[m - 1]} ${y}`, cf: xs.filter((i) => i.type === "crossfit").length, hx: xs.filter((i) => i.type === "hyrox").length };
  });
  const inWin = rows.reduce((s, r) => s + r.cf + r.hx, 0);
  const busiest = [...rows].sort((a, b) => b.cf + b.hx - (a.cf + a.hx))[0];
  const quiet = [...rows].sort((a, b) => a.cf + a.hx - (b.cf + b.hx))[0];
  const hxTop = [...rows].sort((a, b) => b.hx - a.hx)[0];
  const later = items.filter((i) => i.startDate.slice(0, 7) > keys[keys.length - 1]).length;
  return {
    id: "stat-takvim-aylar", cat: "genel",
    title: "Önümüzdeki 7 ay: ay ay yarışma takvimi",
    dataText: [
      `Kaynak: Hibrit Portal yarışma takvimi (cal/src/data/calendar.json, güncelleme ${D.ref}).`,
      `Yöntem: Takvimdeki yarışmalar başlangıç tarihinin ayına göre sayıldı (${rows[0].long} – ${rows[rows.length - 1].long}). Online etapları ve tarihi tahmini kayıtları da içerir.`,
      ...rows.map((r) => `- ${r.long}: ${r.cf + r.hx} yarışma (CrossFit ${r.cf}, HYROX ${r.hx})`),
      `- Bu 7 ayda toplam ${inWin} yarışma. En yoğun ay: ${busiest.long} (${busiest.cf + busiest.hx}). En sakin ay: ${quiet.long} (${quiet.cf + quiet.hx}). HYROX için en yoğun ay: ${hxTop.long} (${hxTop.hx}).`,
      `- Bu pencereden sonrası için takvimde yalnızca ${later} kayıt var.`,
      `Uyarı: Yakın aylarda yerel yarışmalar (circle21 platformu) daha çok listelendiği için ilk aylar daha kalabalık görünür; ileri aylar duyuruldukça dolacak. Bu tablo "kesin yoğunluk" değil, bugünkü takvimin fotoğrafıdır.`,
    ].join("\n"),
    table: {
      columns: ["Ay", "CrossFit", "HYROX", "Toplam"],
      rows: rows.map((r) => [r.label, fmt(r.cf), fmt(r.hx), fmt(r.cf + r.hx)]),
    },
    note: `Hibrit Portal takvimi, ${D.ref} itibarıyla, ${inWin} yarışma.`,
    sourceName: SOURCE_NAME,
    sourceUrls: topUrls(items.filter((i) => keys.includes(i.startDate.slice(0, 7))).map(calSourceUrl)),
  };
}

// ---------- 5) HYROX: ülkelere göre resmi yarışlar ----------
function hyroxCountries(D) {
  const items = D.cal.items.filter((i) => i.type === "hyrox");
  const official = items.filter((i) => i.source !== "circle21" && !/sim(ulation)?\b|-style/i.test(i.name));
  const withC = official.filter((i) => !NO_COUNTRY.has(i.country));
  const m = new Map();
  for (const i of withC) { const c = normCountry(i.country); m.set(c, (m.get(c) ?? 0) + 1); }
  const all = [...m.entries()].map(([c, n]) => ({ c, n })).sort((a, b) => b.n - a.n || a.c.localeCompare(b.c, "tr"));
  const rank = all.findIndex((r) => r.c === TR) + 1;
  let rows = all.slice(0, MAX_ROWS);
  if (rank > MAX_ROWS) rows = [...all.slice(0, MAX_ROWS - 1), all[rank - 1]];
  const trList = withC.filter((i) => i.country === TR);
  return {
    id: "stat-hyrox-ulkeler", cat: "hyrox",
    title: "HYROX takviminde hangi ülke önde?",
    dataText: [
      `Kaynak: Hibrit Portal yarışma takvimi (cal/src/data/calendar.json, güncelleme ${D.ref}).`,
      `Yöntem: Takvimdeki HYROX yarışları ülkelere göre sayıldı. HYROX simülasyonu / "HYROX tarzı" yerel etkinlikler (${items.length - official.length} kayıt) çıkarıldı; kalan ${official.length} resmi HYROX yarışının ${withC.length} tanesinin ülkesi belli, ${all.length} ülke.`,
      ...all.slice(0, 10).map((r) => `- ${r.c}: ${r.n} yarış (${pct(r.n, withC.length)})`),
      (() => { const v = all[MAX_ROWS - 2]?.n; const tied = all.filter((r) => r.n === v).map((r) => r.c); return tied.length > 1 ? `- ${v} yarışla eşit ${tied.length} ülke: ${tied.join(", ")} (tabloda yer kısıtı nedeniyle bir kısmı gösterilmiyor olabilir).` : ""; })(),
      `- Türkiye: ${trList.length} yarış (${trList.map((i) => `${i.name}${i.status === "expected" ? " — tarih tahmini" : ""}`).join("; ")}); Türkiye'den fazla yarışı olan ${all.filter((r) => r.n > trList.length).length} ülke var, ${all.filter((r) => r.n === trList.length).length} ülkeyle eşit.`,
      `Uyarı: Takvim yaklaşık bir sezonluk duyuruları içerir; HYROX yeni şehirleri sezon içinde ekledikçe sayılar değişir.`,
    ].join("\n"),
    table: {
      columns: ["Ülke", "Yarış", "Pay"],
      rows: rows.map((r) => [r.c, fmt(r.n), pct(r.n, withC.length)]),
      highlight: rows.map((r, i) => (r.c === TR ? i : -1)).filter((i) => i >= 0),
    },
    note: `Hibrit Portal takvimi, ${withC.length} resmi HYROX yarışı, ${all.length} ülke.`,
    sourceName: SOURCE_NAME,
    sourceUrls: topUrls(official.map(calSourceUrl)),
  };
}

// ---------- 6) CrossFit: en sık hareketler ----------
// Hareket aileleri: bir workout'ta ailenin herhangi bir varyantı geçiyorsa 1 sayılır.
const FAMILIES = [
  ["Pull-up / chest-to-bar", (m) => /pull-up/.test(m)],
  ["Muscle-up (bar/halka)", (m) => /muscle-up/.test(m) && !/log/.test(m)],
  ["Snatch (tüm varyantlar)", (m) => /snatch/.test(m)],
  ["Clean (tüm varyantlar)", (m) => /clean/.test(m)],
  ["Burpee (tüm varyantlar)", (m) => /burpee/.test(m)],
  ["Koşu", (m) => /run/.test(m)],
  ["Kürek (row)", (m) => /^row(ing)?$/.test(m)],
  ["Handstand (yürüme/HSPU)", (m) => /handstand/.test(m)],
  ["Double-under", (m) => /double-under/.test(m)],
  ["Thruster", (m) => /thruster/.test(m)],
  ["Deadlift", (m) => /deadlift/.test(m)],
  ["Squat (OHS/front/back/pistol)", (m) => /(overhead|front|back|pistol) squat/.test(m)],
  ["Toes-to-bar", (m) => /toes-to-bar/.test(m)],
  ["Wall walk", (m) => /wall walk/.test(m)],
  ["Lunge", (m) => /lunge/.test(m)],
  ["Bisiklet (bike)", (m) => /bike/.test(m)],
  ["SkiErg", (m) => /skierg/.test(m)],
  ["Rope climb", (m) => /rope climb/.test(m)],
  ["Wall ball", (m) => /wall[- ]ball/.test(m)],
  ["Box jump / step-over", (m) => /box (jump|step)/.test(m)],
  ["Shoulder-to-overhead / jerk", (m) => /jerk|shoulder-to-overhead/.test(m)],
];
function crossfitMovements(D) {
  const wos = [];
  for (const { e, ed } of D.held) {
    if (e.type !== "crossfit") continue;
    for (const w of ed.workouts ?? []) if ((w.movements ?? []).length) wos.push({ e, ed, w, mv: w.movements.map((x) => String(x).toLowerCase()) });
  }
  const trW = wos.filter(({ e }) => e.country === TR);
  const fam = FAMILIES.map(([name, fn]) => ({
    name,
    n: wos.filter(({ mv }) => mv.some(fn)).length,
    tr: trW.filter(({ mv }) => mv.some(fn)).length,
  })).sort((a, b) => b.n - a.n || b.tr - a.tr || a.name.localeCompare(b.name, "tr"));
  const comps = new Set(wos.map(({ e }) => e.slug));
  const eds = new Set(wos.map(({ e, ed }) => `${e.slug}|${ed.year}|${ed.startDate ?? ""}`));
  const years = wos.map(({ ed }) => Number(ed.year));
  const verified = wos.filter(({ w }) => w.verified === true).length;
  const openN = wos.filter(({ e }) => e.slug === "crossfit-open").length;
  const trEds = [...new Set(trW.map(({ e, ed }) => `${e.name} ${ed.year}`))];
  const rawCount = new Map();
  wos.forEach(({ mv }) => new Set(mv).forEach((x) => rawCount.set(x, (rawCount.get(x) ?? 0) + 1)));
  const rawTop = [...rawCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  const rows = fam.slice(0, MAX_ROWS);
  return {
    id: "stat-crossfit-hareketler", cat: "crossfit",
    title: "CrossFit yarışmalarında en sık çıkan hareketler",
    dataText: [
      `Kaynak: ${SOURCE_NAME} — workout metinleri kayıtlı CrossFit edisyonları. Referans tarih: ${D.ref}.`,
      `Yöntem: Her workout'un hareket listesi hareket ailelerine ayrıldı (ör. "chest-to-bar pull-up" ve "burpee pull-up" → Pull-up ailesi). Bir aile bir workout'ta birden fazla geçse de 1 sayıldı. Sayı = o aileyi içeren workout sayısı.`,
      `- Örneklem: ${wos.length} workout, ${eds.size} edisyon, ${comps.size} farklı yarışma, ${Math.min(...years)}–${Math.max(...years)}. Bunların ${openN} tanesi CrossFit Open workout'u (sonuçları en çok o etkiliyor). ${verified} workout kaynakta doğrulanmış olarak işaretli.`,
      ...fam.slice(0, 10).map((f) => `- ${f.name}: ${f.n}/${wos.length} workout (${pct(f.n, wos.length)}); Türkiye yarışmalarında ${f.tr}/${trW.length}`),
      `- Tek tek hareket adı olarak en sık: ${rawTop.map(([k, v]) => `${k} (${v})`).join(", ")}.`,
      `- Türkiye alt örneklemi çok küçük: yalnızca ${trW.length} workout (${trEds.join(", ")}). Türkiye için "en sık hareket" genellemesi YAPILMAMALI; sadece bu sayılar verilebilir.`,
    ].join("\n"),
    table: {
      columns: ["Hareket ailesi", "Workout", "Oran", `TR (${trW.length})`],
      rows: rows.map((f) => [f.name, fmt(f.n), pct(f.n, wos.length), fmt(f.tr)]),
    },
    note: `${SOURCE_NAME}, ${Math.min(...years)}–${Math.max(...years)}, ${comps.size} yarışmadan ${wos.length} workout.`,
    sourceName: SOURCE_NAME,
    sourceUrls: topUrls(wos.map(({ ed }) => ed.source)),
  };
}

// ---------- 7) Yarışma süresi: Türkiye vs yurt dışı ----------
function durations(D) {
  // Online / çok haftalık etaplar (CrossFit Open) hariç; tarihli ve yapılmış edisyonlar.
  const xs = D.held.filter(({ e, ed }) => ed.startDate && ed.endDate && e.slug !== "crossfit-open" && days(ed.startDate, ed.endDate) <= 7)
    .map(({ e, ed }) => ({ e, ed, d: days(ed.startDate, ed.endDate), tr: e.country === TR }));
  const buckets = [["1 gün", (d) => d === 1], ["2 gün", (d) => d === 2], ["3 gün", (d) => d === 3], ["4+ gün", (d) => d >= 4]];
  const trX = xs.filter((x) => x.tr), inX = xs.filter((x) => !x.tr);
  const avg = (a) => a.reduce((s, x) => s + x.d, 0) / a.length;
  const rows = buckets.map(([lab, fn]) => [lab, `${trX.filter((x) => fn(x.d)).length}`, `${inX.filter((x) => fn(x.d)).length}`]);
  const years = xs.map(({ ed }) => Number(ed.year));
  const inComps = [...new Set(inX.map(({ e }) => e.name))];
  return {
    id: "stat-yarisma-suresi", cat: "genel",
    title: "Türkiye'de yarışmalar kaç gün sürüyor?",
    dataText: [
      `Kaynak: ${SOURCE_NAME}. Referans tarih: ${D.ref}.`,
      `Yöntem: Başlangıç ve bitiş tarihi kayıtlı, yapılmış edisyonların süresi gün olarak hesaplandı (bitiş − başlangıç + 1). Online ve haftalarca süren etaplar (CrossFit Open) hariç. Bazı tarihler kaynakta "doğrulanmadı" notu taşıyor.`,
      `- Örneklem: ${xs.length} edisyon (${Math.min(...years)}–${Math.max(...years)}): Türkiye ${trX.length}, yurt dışı ${inX.length}.`,
      ...rows.map(([lab, a, b]) => `- ${lab}: Türkiye ${a}, yurt dışı ${b}`),
      `- Ortalama süre: Türkiye ${fmt1(avg(trX))} gün, yurt dışı ${fmt1(avg(inX))} gün.`,
      `- Yurt dışı örneklemi büyük uluslararası yarışmalardan oluşuyor (${inComps.join(", ")}); bu yüzden karşılaştırma "Türkiye vs. dünyanın büyük yarışmaları" olarak okunmalı.`,
    ].join("\n"),
    table: { columns: ["Süre", "Türkiye", "Yurt dışı"], rows },
    note: `${SOURCE_NAME}, ${Math.min(...years)}–${Math.max(...years)}, ${xs.length} edisyon (Open hariç).`,
    sourceName: SOURCE_NAME,
    sourceUrls: officialUrls(xs.map(({ e }) => e.website), xs.map(({ ed }) => ed.source)),
  };
}

/** Tüm istatistik konuları (saf fonksiyon: aynı veri dosyaları → aynı çıktı) */
export function statTopics() {
  const D = prepare();
  return [trByYear, trCities, calCountries, calMonths, hyroxCountries, crossfitMovements, durations].map((f) => {
    const t = f(D);
    t.table.rows = t.table.rows.slice(0, MAX_ROWS);
    t.sourceUrls = (t.sourceUrls ?? []).filter(isHttps).slice(0, 6);
    t.asOf = D.ref;
    t.asOfLabel = refLabel(D.ref);
    return t;
  });
}
