/**
 * Yarışma takvimi senkronu.
 * Kaynaklar (birbirinden bağımsız; biri bozulursa diğerleri yazılır):
 *  - circle21 public API  (TR + seçili Avrupa ülkeleri, functional fitness)
 *  - HYROX takvimi: hyranking.com JSON-LD birincil, hyresult.com yedek
 *  - Önceki dosyadaki araştırma/manuel kayıtlar (source alanı otomatik kaynak değilse) korunur
 *  - src/data/calendar.manual.json (elle girilen: Competition Corner, Instagram duyuruları)
 * Çıktı: src/data/calendar.json  { updated, sources, items[] }
 * Kural: hiçbir kaynak başarılı değilse dosyaya dokunulmaz (son sağlam veri korunur).
 */
import fs from "node:fs";
import { fetchJson, slugify, readJson, writeIfBetter, jsonLdFrom, isoDate, sleep } from "./lib.mjs";

const OUT = "src/data/calendar.json";
const MANUAL = "src/data/calendar.manual.json";
const EVENT_DIR = "src/data/events";
const COUNTRIES = (process.env.CIRCLE_COUNTRIES ?? "TR,DE,NL,GB,ES,IT,FR,GR,AT,CH,BE,PL,PT,SE,DK,CZ,HU,RO,BG,AE").split(",");
const CC = { TR: "Türkiye", DE: "Almanya", NL: "Hollanda", GB: "Birleşik Krallık", ES: "İspanya", IT: "İtalya", FR: "Fransa", GR: "Yunanistan", AT: "Avusturya", CH: "İsviçre", BE: "Belçika", PL: "Polonya", PT: "Portekiz", SE: "İsveç", DK: "Danimarka", CZ: "Çekya", HU: "Macaristan", RO: "Romanya", BG: "Bulgaristan", AE: "BAE", US: "ABD", AL: "Arnavutluk" };
const NOT_A_COMP = /workshop|master\s?class|seminar|kurs|clinic|webinar|certification|course|camp\b/i;
const COUNTRY_RE = /t[üu]rkiye|turkey|germany|deutschland|united kingdom|spain|españa|italia|france|nederland|netherlands|schweiz|switzerland|österreich|austria|belgi|portugal|sverige|danmark|polska|česko|magyar|rom[aâ]nia|българия|united arab emirates/i;

const sources = {};
const items = [];

// Arşivdeki event slug'larıyla eşleştirme (isim benzerliği)
const eventSlugs = fs.existsSync(EVENT_DIR)
  ? fs.readdirSync(EVENT_DIR).filter((f) => f.endsWith(".json")).map((f) => ({ slug: f.replace(/\.json$/, ""), name: (readJson(`${EVENT_DIR}/${f}`, {}).name ?? "").toLowerCase() }))
  : [];
const matchSlug = (name) => {
  const n = String(name).toLowerCase();
  const hit = eventSlugs.find((e) => e.name && (n.includes(e.name) || e.name.includes(n.replace(/\s*\d{4}.*$/, "").trim())));
  return hit?.slug ?? null;
};
const daysBetween = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
const MONTH_NOTE = /\s*\((January|February|March|April|May|June|July|August|September|October|November|December)\)\s*/i;
/** "HYROX Barcelona 2026 (November) - Barcelona" -> "HYROX Barcelona 2026": ay notu ve şehirle aynı " - City" eki silinir. */
function cleanName(name, city) {
  let n = String(name ?? "").replace(MONTH_NOTE, " ").replace(/\s{2,}/g, " ").trim();
  if (city) {
    const m = n.match(/\s+[-–·]\s+([^-–·]+)$/);
    if (m && m[1].trim().toLowerCase() === String(city).trim().toLowerCase()) n = n.slice(0, m.index).trim();
  }
  return n;
}

function cityFromAddress(addr) {
  const clean = String(addr ?? "").replace(/<br\s*\/?>/gi, ",").replace(/<[^>]+>/g, "");
  const parts = clean
    .split(",")
    .map((s) => s.replace(/\b\d{4,}\b/g, "").replace(/\b[A-Z]{1,2}\s?[A-Z0-9]{1,2}\b\s*$/, "").trim())
    .filter((s) => s && !COUNTRY_RE.test(s));
  const raw = parts.length ? parts[parts.length - 1] : "";
  return raw.split("/").pop()?.replace(/^\d+\s*/, "").trim() || undefined;
}

// ---- circle21 ----
async function circle21() {
  const got = [];
  for (const c of COUNTRIES) {
    let page = 1, last = 1;
    do {
      const r = await fetchJson(`https://api.circle21.events/api/competition/?country=${c}&upcoming=1&public=1&per_page=50&page=${page}`);
      if (!r.ok || !r.body?.data) throw new Error(`circle21 ${c} p${page}: ${r.status || r.error}`);
      last = r.body.last_page ?? 1;
      for (const e of r.body.data) {
        if (!e.public || !e.date_from) continue;
        if (NOT_A_COMP.test(e.name)) continue;
        const start = isoDate(e.date_from), end = isoDate(e.date_to ?? e.date_from);
        if (!start) continue;
        if (end && daysBetween(start, end) > 16) continue; // yıl boyu süren seri / bozuk kayıt
        got.push({
          id: `circle21-${e.id}`,
          name: String(e.name).trim(),
          eventSlug: matchSlug(e.name),
          type: /hyrox/i.test(e.name + (e.event_style ?? "")) ? "hyrox" : "crossfit",
          city: cityFromAddress(e.competition_address),
          country: CC[e.country] ?? e.country,
          startDate: start,
          endDate: end,
          status: "confirmed",
          url: `https://circle21.events/event?competitionId=${e.id}`,
          source: "circle21",
          image: e.cover || e.logo || undefined,
          logo: e.logo || undefined,
          imageCredit: e.cover || e.logo ? "circle21 / organizatör" : undefined,
          registration: e.registration_to ? { to: isoDate(e.registration_to), fee: e.entry_fee_value ? `${e.entry_fee_value} ${e.entry_fee_currency ?? ""}`.trim() : undefined } : undefined,
          instagram: e.instagram || undefined,
          website: e.website || undefined,
          maxParticipants: e.max_participant || undefined,
        });
      }
      page++;
      await sleep(400);
    } while (page <= last && page <= 5);
  }
  return got;
}

// ---- HYROX takvimi: hyranking.com birincil, hyresult.com yedek ----
async function hyroxCalendar() {
  const got = [];
  const year = new Date().getFullYear();
  for (const base of ["https://www.hyranking.com", "https://www.hyresult.com"]) {
    const slugs = new Set();
    for (const path of ["/events", "/events/calendar", `/events/${year}`, `/events/${year + 1}`]) {
      const r = await fetchJson(base + path, { retries: 1 });
      if (r.ok && typeof r.body === "string") for (const m of r.body.matchAll(/\/event\/([a-z0-9-]+)/gi)) slugs.add(m[1]);
      await sleep(300);
    }
    if (!slugs.size) { console.warn(`${base}: event linki bulunamadı`); continue; }
    for (const slug of [...slugs].slice(0, 200)) {
      const p = await fetchJson(`${base}/event/${slug}`, { retries: 1 });
      if (!p.ok || typeof p.body !== "string") continue;
      const ev = jsonLdFrom(p.body).find((j) => j["@type"] === "SportsEvent");
      if (!ev?.startDate) continue;
      const city = ev.location?.address?.addressLocality;
      const country = ev.location?.address?.addressCountry;
      const name = cleanName(ev.name, city);
      got.push({
        id: `hyrox-${slug.replace(/^s\d+-/, "")}`,
        name,
        eventSlug: matchSlug(name),
        type: "hyrox",
        city,
        country: /turkey|t[üu]rkiye/i.test(country ?? "") ? "Türkiye" : country,
        startDate: isoDate(ev.startDate),
        endDate: isoDate(ev.endDate ?? ev.startDate),
        status: ev.eventStatus?.includes("Cancelled") ? "cancelled" : "confirmed",
        url: "https://hyrox.com/find-my-race/",
        source: "hyrox",
        sourceUrl: `${base}/event/${slug}`,
      });
      await sleep(350);
    }
    if (got.length) break;
  }
  if (!got.length) throw new Error("hyrox takvimi: hiçbir kaynaktan veri yok");
  return got;
}

const jobs = { circle21, hyrox: hyroxCalendar };
const auto = new Set(Object.keys(jobs));
for (const [name, fn] of Object.entries(jobs)) {
  try {
    const got = await fn();
    items.push(...got);
    sources[name] = { ok: true, count: got.length, fetchedAt: new Date().toISOString() };
    console.log(`[ok] ${name}: ${got.length}`);
  } catch (e) {
    sources[name] = { ok: false, error: String(e.message ?? e), fetchedAt: new Date().toISOString() };
    console.error(`[fail] ${name}: ${e.message ?? e}`);
  }
}

// Manuel kayıtlar her zaman eklenir
const manual = readJson(MANUAL, { items: [] }).items ?? [];
items.push(...manual.map((m) => ({ ...m, source: m.source ?? "manual" })));

// Önceki dosyadan: otomatik olmayan kaynaklar korunur; başarısız otomatik kaynakların eski kayıtları stale bayrağıyla korunur.
const prev = readJson(OUT, { items: [] });
for (const i of prev.items ?? []) {
  if (!i.source || !auto.has(i.source)) items.push(i);
  else if (!sources[i.source]?.ok) items.push({ ...i, stale: true });
}

// Tekilleştir (isim+ay): taze otomatik kayıt > manuel > araştırma; eventSlug korunur
const rank = (x) => (auto.has(x.source) && !x.stale ? 3 : x.source === "manual" ? 2 : 1);
const seen = new Map();
for (const i of items) {
  if (!i.startDate) continue;
  const k = `${slugify(i.name).replace(/-\d{4}$/, "")}|${i.startDate.slice(0, 7)}`;
  const cur = seen.get(k);
  if (!cur || rank(i) > rank(cur)) seen.set(k, { ...(cur ?? {}), ...i, eventSlug: i.eventSlug ?? cur?.eventSlug ?? null });
}

// 120 günden eski bitenleri at; sırala
const cutoff = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
const final = [...seen.values()].filter((i) => (i.endDate ?? i.startDate) >= cutoff).sort((a, b) => a.startDate.localeCompare(b.startDate));

const anyOk = Object.values(sources).some((s) => s.ok);
if (!anyOk && !manual.length) { console.error("Hiçbir kaynak başarılı değil; dosyaya dokunulmadı."); process.exit(2); }
writeIfBetter(OUT, { updated: new Date().toISOString(), sources, items: final }, { minItems: 5 });
