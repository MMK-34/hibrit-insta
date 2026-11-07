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
  fonksiyonel: { label: "FONKSİYONEL" },
  genel: { label: "GÜNDEM" },
};

// satori-html HTML varlıklarını (&amp; vb.) çözmez: "&" olduğu gibi kalır, < > etiket açamasın diye benzer işaretlere çevrilir
const esc = (s = "") => String(s).replace(/</g, "‹").replace(/>/g, "›");
const trUpper = (s = "") => String(s).replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();

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
    const bandH = 620;
    return `<img src="${photo.uri}" style="position:absolute;left:0;top:0;width:${W}px;height:${bandH}px;object-fit:cover" />
      <div style="position:absolute;left:0;top:0;width:${W}px;height:${bandH}px;background-image:linear-gradient(180deg, rgba(14,15,18,0.7) 0%, rgba(14,15,18,0.2) 30%, rgba(14,15,18,0.55) 70%, ${C.ink} 100%)"></div>`;
  }
  const grad = mode === "dim"
    ? "linear-gradient(180deg, rgba(14,15,18,0.86) 0%, rgba(14,15,18,0.8) 50%, rgba(14,15,18,0.95) 100%)"
    : `linear-gradient(180deg, rgba(14,15,18,0.7) 0%, rgba(14,15,18,0.1) 22%, rgba(14,15,18,0.35) 42%, rgba(14,15,18,0.92) 62%, ${C.ink} 100%)`;
  return `<img src="${photo.uri}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;object-fit:cover" />
    <div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background-image:${grad}"></div>`;
}

/** Ortak çerçeve: foto, sol üstte logo, altta @hesap + sağda bilgi. Sağ üst köşe boş (IG sayacı). */
function frame({ inner, footerRight, photo, photoMode, logo }) {
  const bg = photo
    ? photoLayer(photo, photoMode) + (photo.credit ? `<div style="position:absolute;right:${PAD}px;bottom:24px;display:flex;font-family:Body;font-size:15px;color:${C.text3}">${esc(photo.credit)}</div>` : "")
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
const src = (ctx) => (ctx.source ? `KAYNAK: ${trUpper(ctx.source)}` : "");

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
      ${ctx.eventLogo ? `<div style="display:flex;align-self:flex-start;background:${ctx.eventLogo.chip};border:2px solid ${ctx.eventLogo.border};padding:12px 18px;border-radius:6px;margin-bottom:30px"><img src="${ctx.eventLogo.uri}" style="width:${ctx.eventLogo.w}px;height:${ctx.eventLogo.h}px" /></div>` : ""}
      ${tag(ctx, s.kicker)}
      ${head(s.title, headSize(s.title, 150))}
      ${s.subtitle ? `<div style="display:flex;font-size:36px;line-height:1.35;color:${C.text2};margin-top:30px">${esc(s.subtitle)}</div>` : ""}
    </div>` }),

  text: (s, ctx) => frame({ ...ctx, photoMode: "band", footerRight: src(ctx), inner: `
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

  stat: (s, ctx) => frame({ ...ctx, photoMode: "dim", footerRight: src(ctx), inner: `
    <div style="display:flex;flex-direction:column;justify-content:center;flex:1">
      ${tag(ctx, s.label)}
      <div style="display:flex;font-family:Head;font-weight:800;font-size:${s.value.length > 7 ? 220 : 300}px;line-height:0.9;color:${C.paper}">${esc(s.value)}</div>
      ${s.body ? `<div style="display:flex;font-size:36px;line-height:1.4;color:${C.text2};margin-top:40px">${esc(s.body)}</div>` : ""}
    </div>` }),

  table: (s, ctx) => frame({ ...ctx, photoMode: "dim", footerRight: src(ctx), inner: `
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
      ${ctx.source ? `<div style="display:flex;font-family:Body;font-weight:600;font-size:20px;letter-spacing:2px;color:${C.text3};margin-top:50px">${esc(src(ctx))}</div>` : ""}
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

/** Ham foto -> 1080x1350 kırpılmış, siyah-beyaz (marka stili) JPEG data URI */
async function toUri(buf) {
  const j = await sharp(buf).rotate().resize(W, H, { fit: "cover", position: "attention" })
    .grayscale().linear(1.12, -10).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${j.toString("base64")}`;
}

/** Post (slayt listesi) -> dosyalar; dosya yollarını döner. post.photos: [{buf, credit}] (slayt sırasıyla, eksikse döngüsel) */
export async function renderPost(post, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const total = post.slides.length;
  const photos = [];
  for (const p of post.photos ?? []) photos.push({ uri: await toUri(p.buf), credit: p.credit });
  // Etkinlik logosu (yükseklik 64px'e ölçeklenir); açık renk logo koyu rozette, koyu logo açık rozette
  let eventLogo = null;
  if (post.eventLogo?.buf) {
    const m = await sharp(post.eventLogo.buf).metadata();
    const h = 64, w = Math.min(320, Math.round((m.width / m.height) * h));
    const { data, info } = await sharp(post.eventLogo.buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let sum = 0, cnt = 0;
    for (let i = 0; i < data.length; i += info.channels) if (data[i + 3] > 128) { sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; cnt++; }
    const light = cnt && sum / cnt > 150;
    eventLogo = { uri: `data:image/png;base64,${post.eventLogo.buf.toString("base64")}`, w, h: Math.round(w * m.height / m.width), chip: light ? C.ink : C.paper, border: light ? C.line : C.paper };
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
