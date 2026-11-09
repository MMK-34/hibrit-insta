// Slayt render: HTML (satori-html) -> SVG (satori) -> PNG (resvg) -> JPEG (sharp).
// Instagram API yalnızca JPEG kabul eder. Boyut 1080x1350 (4:5; API 3:4 kabul etmiyor).
// Güvenli alan: profil ızgarası 3:4 kırpar (yanlardan ~34px), karoselde sağ üstte IG'nin "1/N" sayacı çıkar.
// Bu yüzden yan boşluk 90px, sağ üst köşe boş bırakılır.
//
// Marka kiti (ana site ile ortak, cf/scripts/brand.py): mürekkep #0e0f12, kâğıt #f3efe7, sinyal kırmızısı #e8321e;
// başlık Big Shoulders Display ExtraBold, gövde Inter; logo = assets/logo-mark.svg + assets/wordmark.svg (sol üst).
// Her postta aynı düzen: siyah-beyaz foto, sol üstte logo, başlık üstünde kırmızı çizgi, altta @hibritportal.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { BRAND } from "./config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1080, H = 1350;
const PAD = 90;
const font = (f) => fs.readFileSync(path.join(ROOT, "fonts", f));
const FONTS = [
  { name: "Body", data: font("Inter-400.ttf"), weight: 400 },
  { name: "Body", data: font("Inter-600.ttf"), weight: 600 },
  { name: "Body", data: font("Inter-700.ttf"), weight: 700 },
  { name: "Head", data: font("BigShouldersDisplay-ExtraBold.ttf"), weight: 800 },
];

const C = {
  ink: "#0e0f12", paper: "#f3efe7", red: "#e8321e",
  text2: "#cfc9be", text3: "#8e897f", line: "#2a2c31",
};
export const CATEGORY = {
  hyrox: { label: "HYROX" },
  crossfit: { label: "CROSSFIT" },
  kosu: { label: "KOŞU" },
  fonksiyonel: { label: "HİBRİT FİTNESS" },
  bilim: { label: "SPOR BİLİMİ" },
  kuvvet: { label: "KUVVET SPORLARI" },
  dovus: { label: "DÖVÜŞ SPORLARI" },
  su: { label: "SU SPORLARI" },
  bisiklet: { label: "BİSİKLET" },
  doga: { label: "TRAIL VE ULTRA" },
  olimpik: { label: "OLİMPİK BRANŞLAR" },
  yaris: { label: "YARIŞ TAKVİMİ" },
  basari: { label: "BAŞARILAR" },
  genel: { label: "GÜNDEM" },
};

// satori-html HTML varlıklarını (&amp; vb.) çözmez: "&" olduğu gibi kalır, < > etiket açamasın diye benzer işaretlere çevrilir
const esc = (s = "") => String(s).replace(/</g, "‹").replace(/>/g, "›");
// Türkçe büyük harf (i -> İ). İngilizce marka ve terimler (CrossFit, SkiErg, Ironman, Rowing, Fitness...) düz büyütülür:
// w/x/q içeren, -ing ile biten ya da listedeki sözcükler İngilizce sayılır.
const EN_WORD = /^(eurasia|throwdown|olympos|alsancak|team|athx|deka|crossfit|skierg|ironman|mixed|rowing|fitness|elite|division|invitational|semifinals?|finals?|triathlon|triathlete|cycling|climbing|science|daily|giro|italia|physiology|journal|international|medicine|nutrition|series|qualifiers?|sprint|swim|swimming|running|rulebook|games|open|online|index|world|championships?|marathon|half|hyrox|wings|life|time|timing|invitational|pro|rx|wod|wodapalooza|rogue|boxrox|slowtwitch|swimswam|gripped|alpinist|irunfar|letsrun|cyclingnews|runner's|runners|trail|ultra-trail|utmb|ironman|strongman|powerlifting|deadlift|squat|bench|snatch|clean|jerk|thruster|muscle-up|pull-up|wall|ball|sled|push|pull|burpee|farmers|carry|lunges|rig|skiing|erg|concept2|velo|outside|pinkbike|fitnessvolt)$/i;
const trUpper = (s = "") => String(s).split(/(\s+|[·|/()])/).map((w) => (EN_WORD.test(w) || /[wxq]/i.test(w) || /ing$/i.test(w) ? w.toUpperCase() : w.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase())).join("");

/** Başlık uzunluğuna göre font boyutu (Big Shoulders dar; büyük punto kaldırır) */
function headSize(text, big = 150) {
  const n = String(text).length;
  if (n <= 18) return big;
  if (n <= 32) return Math.round(big * 0.84);
  if (n <= 50) return Math.round(big * 0.7);
  if (n <= 75) return Math.round(big * 0.58);
  return Math.round(big * 0.48);
}

// ---- Logo: SVG (currentColor) -> kâğıt rengi PNG, bir kez hazırlanır
let LOGO = null;
async function brandLogo() {
  if (LOGO) return LOGO;
  const svg = (f, h) => sharp(Buffer.from(fs.readFileSync(path.join(ROOT, "assets", f), "utf8").replace(/currentColor/g, C.paper)), { density: 400 })
    .resize({ height: h }).png().toBuffer();
  const [mark, word] = await Promise.all([svg("logo-mark.svg", 92), svg("wordmark.svg", 64)]);
  const mm = await sharp(mark).metadata(), wm = await sharp(word).metadata();
  const uri = (b) => `data:image/png;base64,${b.toString("base64")}`;
  LOGO = { mark: { uri: uri(mark), w: mm.width / 2, h: mm.height / 2 }, word: { uri: uri(word), w: wm.width / 2, h: wm.height / 2 } };
  return LOGO;
}

function logoHtml(L) {
  return `<div style="display:flex;align-items:center;gap:14px">
    <img src="${L.mark.uri}" style="width:${L.mark.w}px;height:${L.mark.h}px" />
    <img src="${L.word.uri}" style="width:${L.word.w}px;height:${L.word.h}px" />
  </div>`;
}

/** Fotoğraf katmanı. full: tam ekran alttan koyulaşan; band: üst bant; dim: tam ekran koyu */
function photoLayer(photo, mode) {
  if (!photo) return "";
  if (mode === "band") {
    const bandH = BAND_H;
    return `<img src="${photo.bandUri ?? photo.uri}" style="position:absolute;left:0;top:0;width:${W}px;height:${bandH}px;object-fit:cover" />
      <div style="position:absolute;left:0;top:0;width:${W}px;height:${bandH}px;background-image:linear-gradient(180deg, rgba(14,15,18,0.6) 0%, rgba(14,15,18,0.12) 22%, rgba(14,15,18,0.15) 40%, rgba(14,15,18,0.35) 55%, rgba(14,15,18,0.6) 68%, rgba(14,15,18,0.8) 79%, rgba(14,15,18,0.93) 89%, ${C.ink} 100%)"></div>`;
  }
  const grad = mode === "dim"
    ? "linear-gradient(180deg, rgba(14,15,18,0.86) 0%, rgba(14,15,18,0.8) 50%, rgba(14,15,18,0.95) 100%)"
    // Fotoğraftan zemine uzun ve kademeli geçiş (sert çizgi olmasın); başlık bölgesi (alt ~%30) yine tam koyu
    : `linear-gradient(180deg, rgba(14,15,18,0.6) 0%, rgba(14,15,18,0.12) 18%, rgba(14,15,18,0.1) 36%, rgba(14,15,18,0.22) 48%, rgba(14,15,18,0.4) 57%, rgba(14,15,18,0.6) 64%, rgba(14,15,18,0.78) 71%, rgba(14,15,18,0.92) 78%, ${C.ink} 86%)`;
  return `<img src="${photo.uri}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;object-fit:cover" />
    <div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background-image:${grad}"></div>`;
}

/** Ortak çerçeve: foto, sol üstte logo, altta @hesap + sağda bilgi. Sağ üst köşe boş (IG sayacı). */
function frame({ inner, footerRight, photo, photoMode, logo }) {
  const bg = photo
    ? photoLayer(photo, photoMode)
    : "";
  return `<div style="display:flex;flex-direction:column;width:${W}px;height:${H}px;background:${C.ink};position:relative;font-family:Body;color:${C.paper}">
    ${bg}
    <div style="display:flex;position:relative;padding:64px ${PAD}px 0 ${PAD}px">${logoHtml(logo)}</div>
    <div style="display:flex;position:relative;flex-direction:column;flex:1;padding:0 ${PAD}px">${inner}</div>
    <div style="display:flex;position:relative;justify-content:space-between;align-items:center;padding:0 ${PAD}px 60px ${PAD}px">
      <div style="display:flex;font-family:Body;font-weight:600;font-size:28px;color:${C.paper}">${esc(BRAND.handle.replace(/^@/, ""))}</div>
      <div style="display:flex;font-family:Body;font-weight:600;font-size:20px;letter-spacing:2px;color:${C.text3}">${esc(footerRight ?? "")}</div>
    </div>
  </div>`;
}

/** Kırmızı çizgi + kategori etiketi (+ karosel sayacı) */
function tag(ctx, extra) {
  const k = CATEGORY[ctx.cat] ?? CATEGORY.genel;
  const counter = ctx.total > 1 ? `<div style="display:flex;margin-left:18px;color:${C.text3}">${String(ctx.index).padStart(2, "0")}/${String(ctx.total).padStart(2, "0")}</div>` : "";
  return `<div style="display:flex;width:110px;height:10px;background:${C.red};margin-bottom:22px"></div>
    <div style="display:flex;align-items:center;font-family:Body;font-weight:700;font-size:24px;letter-spacing:3px;color:${C.red};margin-bottom:22px">${esc(trUpper(extra ? `${k.label} · ${extra}` : k.label))}${counter}</div>`;
}

const head = (text, size) => `<div style="display:flex;font-family:Head;font-weight:800;font-size:${size}px;line-height:0.98;color:${C.paper}">${esc(trUpper(text))}</div>`;

// ---- Tablo slaytı yerleşimi: sütun genişliği + punto, iç alana (yükseklik/genişlik) sığacak şekilde hesaplanır
const TBL_W = W - 2 * PAD;            // 900px
const TBL_GAP = 28;                   // sütun arası
const INNER_H = H - 110 - 94;         // logo şeridi ve alt bilgi dışındaki yükseklik (~1146px)
const isNum = (s) => /^[\s%+\-–—.,:/x×\d]+$/.test(String(s ?? "").trim()) && /\d/.test(String(s));
// satori-html HTML varlıklarını (&amp; vb.) çözmüyor: tablo hücrelerinde & olduğu gibi kalır, < > benzer işaretlerle değiştirilir
const cellText = (s = "") => String(s).replace(/</g, "‹").replace(/>/g, "›");
const numVal = (s) => { const m = String(s ?? "").replace(/\./g, "").replace(",", ".").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };
/** Inter için kaba karakter genişliği (em) — tahmini, güvenli tarafta */
const textW = (s, f, k = 0.58) => String(s ?? "").length * f * k;
/** Başlık (Big Shoulders, büyük harf) satır sayısı tahmini */
const headLines = (text, size) => Math.max(1, Math.ceil((String(text).length * size * 0.47) / TBL_W));

function tableLayout(s) {
  const cols = s.columns ?? [];
  const rows = (s.rows ?? []).slice(0, 7);
  const n = Math.max(cols.length, ...rows.map((r) => r.length), 1);
  const num = Array.from({ length: n }, (_, j) => j > 0 && rows.length > 0 && rows.every((r) => r[j] == null || r[j] === "" || isNum(r[j])));
  const titleSize = headSize(s.title ?? "", 96);
  const titleH = headLines(s.title ?? "", titleSize) * titleSize * 0.98;
  const noteH = s.note ? Math.ceil(textW(s.note, 24, 0.55) / TBL_W) * 24 * 1.35 + 34 : 0;
  const fixedH = 83 + titleH + 44 /* başlık-tablo arası */ + 54 /* başlık satırı */ + noteH;
  // çubuk sütunu: s.barCol > "Toplam" başlıklı sayı sütunu > ilk sayı sütunu
  const totalCol = cols.findIndex((c, j) => num[j] && /toplam|total/i.test(c));
  const bar = Number.isInteger(s.barCol) ? s.barCol : totalCol >= 0 ? totalCol : num.indexOf(true);
  for (let f = 34; f >= 22; f -= 2) {
    const hf = Math.max(16, Math.round(f * 0.6));          // sütun başlığı punto
    const hW = (j) => textW(trUpper(cols[j] ?? ""), hf, 0.72) + String(cols[j] ?? "").length * 2;
    // sayı sütunları kırılmaz: içerik ya da başlık kadar geniş
    const need = Array.from({ length: n }, (_, j) => Math.max(hW(j), ...rows.map((r) => textW(r[j], f, num[j] ? 0.62 : 0.58))) + 4);
    const numW = need.reduce((a, w, j) => a + (num[j] ? w : 0), 0);
    const free = TBL_W - TBL_GAP * (n - 1) - numW;
    const textCols = need.map((w, j) => (num[j] ? 0 : w));
    const textSum = textCols.reduce((a, b) => a + b, 0);
    if (free < 120 * textCols.filter(Boolean).length) continue;
    const widths = need.map((w, j) => (num[j] ? Math.ceil(w) : Math.floor((free * textCols[j]) / textSum)));
    // metin sütunlarına artan alanı ver, kırılma satır sayısını hesapla
    const lines = rows.map((r) => Math.max(1, ...r.map((c, j) => (num[j] ? 1 : Math.ceil(textW(c, f) / Math.max(1, widths[j] - 4))))));
    const padV = f >= 30 ? 16 : 12;
    const barH = bar >= 0 ? 12 : 0;
    const rowH = lines.map((l) => l * f * 1.22 + 2 * padV + barH + 1);
    const total = fixedH + rowH.reduce((a, b) => a + b, 0);
    if (total <= INNER_H - 40 && Math.max(...lines) <= 2) return { cols, rows, n, num, widths, f, hf, padV, bar, titleSize };
  }
  // son çare: en küçük punto, eşit metin sütunları
  const f = 22, hf = 16;
  const widths = Array.from({ length: n }, () => Math.floor((TBL_W - TBL_GAP * (n - 1)) / n));
  return { cols, rows, n, num, widths, f, hf, padV: 10, bar, titleSize: Math.min(headSize(s.title ?? "", 96), 64) };
}

function tableHtml(s) {
  const L = tableLayout(s);
  const hl = new Set(s.highlight ?? []);
  const vals = L.bar >= 0 ? L.rows.map((r) => numVal(r[L.bar])) : [];
  const max = Math.max(0, ...vals.filter((v) => Number.isFinite(v)));
  const cell = (txt, j, extra = "") => `<div style="display:flex;width:${L.widths[j]}px;${j ? `margin-left:${TBL_GAP}px;` : ""}justify-content:${L.num[j] ? "flex-end" : "flex-start"};${L.num[j] ? "text-align:right;" : ""}${extra}">${cellText(txt ?? "")}</div>`;
  const headRow = `<div style="display:flex;align-items:flex-end;padding-bottom:14px;border-bottom:2px solid ${C.red};font-family:Body;font-weight:700;font-size:${L.hf}px;letter-spacing:2px;color:${C.red}">
    ${Array.from({ length: L.n }, (_, j) => cell(trUpper(L.cols[j] ?? ""), j)).join("")}</div>`;
  const body = L.rows.map((r, i) => {
    const v = vals[i];
    const isMax = Number.isFinite(v) && v === max && max > 0;
    const w = Number.isFinite(v) && v > 0 && max > 0 ? Math.max(6, Math.round((v / max) * TBL_W)) : 0;
    const on = hl.has(i);
    const barDiv = L.bar >= 0 ? `<div style="display:flex;width:${TBL_W}px;height:4px;margin-top:8px"><div style="display:flex;width:${w}px;height:4px;background:${isMax ? C.red : on ? C.paper : "#4a4c52"}"></div></div>` : "";
    return `<div style="display:flex;flex-direction:column;padding:${L.padV}px 0 ${L.padV}px 0;border-bottom:1px solid ${C.line}">
      <div style="display:flex;align-items:flex-start;font-family:Body;font-size:${L.f}px;line-height:1.22;color:${C.paper}">
        ${r.slice(0, L.n).concat(Array(Math.max(0, L.n - r.length)).fill("")).map((c, j) => cell(c, j, `font-weight:${j === 0 || on ? 600 : 400};color:${on ? C.red : j === 0 || L.num[j] ? C.paper : C.text2}`)).join("")}
      </div>${barDiv}
    </div>`;
  }).join("");
  return `<div style="display:flex;flex-direction:column;width:${TBL_W}px;margin-top:44px">${headRow}${body}</div>`;
}

const T = {
  cover: (s, ctx) => frame({ ...ctx, photoMode: "full", footerRight: ctx.total > 1 ? "KAYDIR →" : ctx.date, inner: `
    <div style="display:flex;flex-direction:column;justify-content:flex-end;flex:1;padding-bottom:52px">
      ${ctx.eventLogo ? (ctx.eventLogo.tile
        ? `<div style="display:flex;align-self:flex-start;margin-bottom:36px;border-radius:22px;overflow:hidden;border:3px solid ${C.paper}"><img src="${ctx.eventLogo.uri}" style="width:${ctx.eventLogo.w}px;height:${ctx.eventLogo.h}px" /></div>`
        : `<div style="display:flex;align-self:flex-start;background:${ctx.eventLogo.chip};border:2px solid ${ctx.eventLogo.border};padding:20px 28px;border-radius:12px;margin-bottom:36px"><img src="${ctx.eventLogo.uri}" style="width:${ctx.eventLogo.w}px;height:${ctx.eventLogo.h}px" /></div>`) : ""}
      ${tag(ctx, s.kicker)}
      ${head(s.title, headSize(s.title, 150))}
      ${s.subtitle ? `<div style="display:flex;font-size:36px;line-height:1.35;color:${C.text2};margin-top:30px">${esc(s.subtitle)}</div>` : ""}
    </div>` }),

  text: (s, ctx) => frame({ ...ctx, photoMode: "band", footerRight: ctx.date, inner: `
    <div style="display:flex;flex-direction:column;justify-content:${ctx.photo ? "flex-end" : "center"};flex:1;padding-bottom:${ctx.photo ? 52 : 0}px">
      ${tag(ctx)}
      ${head(s.title, headSize(s.title, 100))}
      <div style="display:flex;flex-direction:column;margin-top:30px">
        ${s.body ? `<div style="display:flex;font-size:36px;line-height:1.42;color:${C.text2}">${esc(s.body)}</div>` : ""}
        ${(s.bullets ?? []).map((b) => `<div style="display:flex;gap:22px;margin-top:22px;align-items:flex-start">
          <div style="display:flex;width:14px;height:14px;margin-top:16px;background:${C.red}"></div>
          <div style="display:flex;flex:1;font-size:34px;line-height:1.36;color:${C.paper}">${esc(b)}</div></div>`).join("")}
      </div>
    </div>` }),

  stat: (s, ctx) => frame({ ...ctx, photoMode: "dim", footerRight: ctx.date, inner: `
    <div style="display:flex;flex-direction:column;justify-content:center;flex:1">
      ${tag(ctx, s.label)}
      <div style="display:flex;font-family:Head;font-weight:800;font-size:${s.value.length > 7 ? 220 : 300}px;line-height:0.9;color:${C.paper}">${esc(s.value)}</div>
      ${s.body ? `<div style="display:flex;font-size:36px;line-height:1.4;color:${C.text2};margin-top:40px">${esc(s.body)}</div>` : ""}
    </div>` }),

  table: (s, ctx) => frame({ ...ctx, photoMode: "dim", footerRight: ctx.date, inner: `
    <div style="display:flex;flex-direction:column;justify-content:center;flex:1">
      ${tag(ctx, s.label)}
      ${head(s.title ?? "", tableLayout(s).titleSize)}
      ${tableHtml(s)}
      ${s.note ? `<div style="display:flex;font-family:Body;font-size:24px;line-height:1.35;color:${C.text3};margin-top:34px">${cellText(s.note)}</div>` : ""}
    </div>` }),

  end: (s, ctx) => frame({ ...ctx, photoMode: "dim", footerRight: ctx.date, inner: `
    <div style="display:flex;flex-direction:column;justify-content:center;flex:1">
      ${tag(ctx)}
      ${head(s.title ?? "Sizce?", headSize(s.title ?? "", 120))}
      ${s.body ? `<div style="display:flex;font-size:36px;line-height:1.4;color:${C.text2};margin-top:30px">${esc(s.body)}</div>` : ""}
      <div style="display:flex;gap:16px;margin-top:60px">
        ${["KAYDET", "PAYLAŞ", "TAKİP ET"].map((x, i) => `<div style="display:flex;border:2px solid ${i === 2 ? C.red : C.paper};background:${i === 2 ? C.red : "transparent"};padding:16px 26px;font-family:Body;font-weight:700;font-size:24px;letter-spacing:2px;color:${C.paper}">${x}</div>`).join("")}
      </div>
    </div>` }),
};

/** Tek slayt -> JPEG Buffer */
export async function renderSlide(slide, ctx) {
  const tpl = T[slide.type] ?? T.text;
  const logo = await brandLogo();
  const svg = await satori(html(tpl(slide, { ...ctx, logo })), { width: W, height: H, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  return sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

// Slaytta fotoğrafın görünen kısmı: tam ekran düzende üstteki ~940px (altını başlık paneli kapatır), bant düzeninde üstteki 760px (alt kısmı uzun bir geçişle zemine erir).
// Fotoğraf bu görünen pencereye göre kırpılır: yatay fotoğraf gereksiz büyütülmez, kişiler kesilmez.
const VIS_FULL = 940, BAND_H = 760;

/** Fotoğrafı bw x bh pencereye kırp. focus (0-1 oran, görsel denetimden) varsa ana kişiler yatayda ortada, dikeyde fy oranında kalır. */
async function cropTo(buf, focus, bw, bh, fy) {
  const { data, info } = await sharp(buf).rotate().toBuffer({ resolveWithObject: true });
  if (!focus) return sharp(data).resize(bw, bh, { fit: "cover", position: "attention" }).toBuffer();
  const s = Math.max(bw / info.width, bh / info.height);
  const sw = Math.max(bw, Math.ceil(info.width * s)), sh = Math.max(bh, Math.ceil(info.height * s));
  const clamp = (v, max) => Math.min(Math.max(0, Math.round(v)), max);
  const left = clamp(focus.x * sw - bw / 2, sw - bw), top = clamp(focus.y * sh - bh * fy, sh - bh);
  return sharp(await sharp(data).resize(sw, sh, { fit: "fill" }).toBuffer()).extract({ left, top, width: bw, height: bh }).toBuffer();
}

const style = (img) => img.grayscale().linear(1.12, -10).jpeg({ quality: 82 }).toBuffer();

/** Ham foto -> { uri: 1080x1350 (fotoğraf üstteki görünen alanda, altı koyu zemin), bandUri: 1080x620 } siyah-beyaz (marka stili) JPEG data URI */
async function toUri(buf, focus) {
  const top = await cropTo(buf, focus, W, VIS_FULL, 0.45);
  // Fotoğrafın alt kenarı zemine keskin girmesin: son ~420px yumuşak bir eğriyle (ease) zemin rengine erir
  const FADE = 420, steps = 12;
  const stops = Array.from({ length: steps + 1 }, (_, i) => { const t = i / steps; return `<stop offset="${t}" stop-color="${C.ink}" stop-opacity="${(t * t * (3 - 2 * t)).toFixed(3)}"/>`; }).join("");
  const fade = Buffer.from(`<svg width="${W}" height="${FADE}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs><rect width="${W}" height="${FADE}" fill="url(#g)"/></svg>`);
  // composite sharp hattında en son uygulanır: önce birleştirip PNG al, siyah-beyaz stil sonra
  const merged = await sharp({ create: { width: W, height: H, channels: 3, background: C.ink } }).composite([{ input: top, left: 0, top: 0 }, { input: fade, left: 0, top: VIS_FULL - FADE }]).png().toBuffer();
  const full = await style(sharp(merged));
  const band = await style(sharp(await cropTo(buf, focus, W, BAND_H, 0.5)));
  return { uri: `data:image/jpeg;base64,${full.toString("base64")}`, bandUri: `data:image/jpeg;base64,${band.toString("base64")}` };
}

/** Kapak slaytından 1080x1920 hikâye kartı: mürekkep zemin, kapak ortada, üstte küçük "YENİ PAYLAŞIM" etiketi. */
export async function renderStory(coverFile, outFile) {
  const SW = 1080, SH = 1920, top = Math.round((SH - H) / 2);
  const label = Buffer.from(`<svg width="${SW}" height="${top}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${PAD}" y="${top - 92}" width="110" height="10" fill="${C.red}"/>
    <text x="${PAD}" y="${top - 40}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="26" letter-spacing="3" fill="${C.red}">YENİ PAYLAŞIM</text>
    <text x="${SW - PAD}" y="${top - 40}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="24" letter-spacing="3" fill="${C.text3}">PROFİLDE</text>
  </svg>`);
  const buf = await sharp({ create: { width: SW, height: SH, channels: 3, background: C.ink } })
    .composite([{ input: coverFile, left: 0, top }, { input: label, left: 0, top: 0 }])
    .jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  fs.writeFileSync(outFile, buf);
  return outFile;
}

/**
 * Geri sayım hikâye kartı (1080x1920): "HYROX İSTANBUL'A / 7 / GÜN".
 * c: { kicker, number, unit, title, date, place, eventLogo?: {buf} }
 */
export async function renderCountdown(c, outFile) {
  const SW = 1080, SH = 1920;
  const L = await brandLogo();
  let logo = "";
  if (c.eventLogo?.buf) {
    const m = await sharp(c.eventLogo.buf).metadata();
    const h = 110, w = Math.min(420, Math.round((m.width / m.height) * h));
    logo = `<div style="display:flex;align-self:flex-start;background:${C.paper};padding:18px 26px;border-radius:8px;margin-bottom:56px"><img src="data:image/png;base64,${c.eventLogo.buf.toString("base64")}" style="width:${w}px;height:${Math.round(w * m.height / m.width)}px" /></div>`;
  }
  const num = String(c.number);
  const markup = `<div style="display:flex;width:${SW}px;height:${SH}px;background:${C.ink};font-family:Body;color:${C.paper}"><div style="display:flex;flex-direction:column;width:${SW - 2 * PAD}px;height:${SH - 520}px;margin:260px ${PAD}px 260px ${PAD}px">
    <div style="display:flex">${logoHtml(L)}</div>
    <div style="display:flex;flex-direction:column;flex:1;justify-content:center">
      ${logo}
      <div style="display:flex;width:110px;height:10px;background:${C.red};margin-bottom:34px"></div>
      <div style="display:flex;font-weight:700;font-size:40px;letter-spacing:4px;color:${C.red}">${esc(trUpper(c.kicker))}</div>
      <div style="display:flex;align-items:flex-end;margin-top:10px">
        <div style="display:flex;font-family:Head;font-weight:800;font-size:${num.length > 2 ? 360 : 460}px;line-height:0.86;color:${C.paper}">${esc(num)}</div>
        <div style="display:flex;font-family:Head;font-weight:800;font-size:130px;line-height:1;color:${C.paper};margin-left:24px;margin-bottom:34px">${esc(trUpper(c.unit))}</div>
      </div>
      <div style="display:flex;margin-top:46px">${head(c.title, headSize(c.title, 110))}</div>
      <div style="display:flex;font-size:42px;color:${C.text2};margin-top:30px">${esc([c.date, c.place].filter(Boolean).join(" · "))}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:34px;font-weight:600">
      <div style="display:flex">hibritportal</div>
      <div style="display:flex;color:${C.text3};font-size:28px;letter-spacing:3px">GERİ SAYIM</div>
    </div>
  </div></div>`;
  const svg = await satori(html(markup), { width: SW, height: SH, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: SW } }).render().asPng();
  const buf = await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  fs.writeFileSync(outFile, buf);
  return outFile;
}

/** Post (slayt listesi) -> dosyalar; dosya yollarını döner. post.photos: [{buf, credit}] (slayt sırasıyla, eksikse döngüsel) */
export async function renderPost(post, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const total = post.slides.length;
  const photos = [];
  for (const p of post.photos ?? []) photos.push({ ...(await toUri(p.buf, p.focus)), credit: p.credit });
  // Etkinlik logosu kapakta belirgin gösterilir (kullanıcı isteği: daha büyük ve görünür).
  //  - Saydam zeminli logo: renk kontrastına göre açık ya da koyu rozet içinde, yükseklik 120px (geniş logolar en çok 520px)
  //  - Saydam olmayan kare/fotoğraf logo (ör. Instagram profil görseli): rozetsiz, köşeleri yuvarlatılmış 190px kare karo
  let eventLogo = null;
  if (post.eventLogo?.buf) {
    const m = await sharp(post.eventLogo.buf).metadata();
    const ratio = m.width / m.height;
    const { data, info } = await sharp(post.eventLogo.buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let sum = 0, cnt = 0, transparent = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 3] > 128) { sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; cnt++; }
      if (data[i + 3] < 200) transparent++;
    }
    const light = cnt && sum / cnt > 150;
    const opaque = transparent / (info.width * info.height) < 0.02;
    // Saydam olmayan logolar (kendi zemini olan) rozetsiz, yuvarlatılmış karo olarak gösterilir; kare olanlar büyük
    const tile = opaque;
    const h = tile ? 190 : 120;
    const w = tile ? Math.round(190 * ratio) : Math.min(520, Math.round(ratio * h));
    eventLogo = { uri: `data:image/png;base64,${post.eventLogo.buf.toString("base64")}`, w, h: Math.round(w / ratio), tile,
      chip: light ? C.ink : C.paper, border: light ? C.line : C.paper };
  }
  const files = [];
  for (let i = 0; i < total; i++) {
    const photo = photos.length ? photos[i % photos.length] : null;
    const buf = await renderSlide(post.slides[i], { cat: post.category, index: i + 1, total, source: post.source, date: post.dateLabel, photo, eventLogo: i === 0 ? eventLogo : null });
    const f = path.join(outDir, `${String(i + 1).padStart(2, "0")}.jpg`);
    fs.writeFileSync(f, buf);
    files.push(f);
  }
  return files;
}
