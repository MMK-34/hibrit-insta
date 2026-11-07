// Slayt render: HTML (satori-html) -> SVG (satori) -> PNG (resvg) -> JPEG (sharp).
// Instagram API yalnızca JPEG kabul eder. Boyut 1080x1350 (4:5; API 3:4 kabul etmiyor).
// Güvenli alan: profil ızgarası 3:4 kırpar (yanlardan ~34px), karoselde sağ üstte IG'nin "1/N" sayacı çıkar.
// Bu yüzden yan boşluk 90px, sağ üst köşe boş bırakılır.
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
const font = (f) => fs.readFileSync(path.join(ROOT, "fonts", f));
const FONTS = [
  { name: "Body", data: font("Archivo-400.ttf"), weight: 400 },
  { name: "Body", data: font("Archivo-600.ttf"), weight: 600 },
  { name: "Body", data: font("Archivo-800.ttf"), weight: 800 },
  { name: "Head", data: font("ArchivoCond-600.ttf"), weight: 600 },
  { name: "Head", data: font("ArchivoCond-800.ttf"), weight: 800 },
  { name: "Mono", data: font("Mono-500.ttf"), weight: 500 },
];

const C = {
  bg: "#141518", bg2: "#0f1012", surface: "#1b1d21", border: "#2b2f35",
  text: "#efeae2", text2: "#b9b3a9", text3: "#857f75",
};
export const CATEGORY = {
  hyrox: { label: "HYROX", color: "#5fa8ff" },
  crossfit: { label: "CROSSFIT", color: "#ff5a2c" },
  kosu: { label: "KOŞU", color: "#8fbf9a" },
  fonksiyonel: { label: "FONKSİYONEL", color: "#f2b84b" },
  genel: { label: "GÜNDEM", color: "#efeae2" },
};

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const trUpper = (s = "") => String(s).replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();

/** Başlık uzunluğuna göre font boyutu */
function headSize(text, big = 132) {
  const n = text.length;
  if (n <= 22) return big;
  if (n <= 40) return Math.round(big * 0.82);
  if (n <= 60) return Math.round(big * 0.68);
  if (n <= 85) return Math.round(big * 0.56);
  return Math.round(big * 0.46);
}

function logo() {
  if (BRAND.logoPath && fs.existsSync(path.join(ROOT, BRAND.logoPath))) {
    const b64 = fs.readFileSync(path.join(ROOT, BRAND.logoPath)).toString("base64");
    return `<img src="data:image/png;base64,${b64}" style="height:56px" />`;
  }
  // Geçici kelime logosu (gerçek logo gelince BRAND.logoPath ile değişir)
  return `<div style="display:flex;align-items:center;gap:14px">
    <div style="display:flex;width:44px;height:44px;background:${C.text};align-items:center;justify-content:center;font-family:Head;font-weight:800;font-size:30px;color:${C.bg}">${esc(BRAND.mark)}</div>
    <div style="display:flex;font-family:Head;font-weight:800;font-size:34px;letter-spacing:1px;color:${C.text}">${esc(trUpper(BRAND.name))}</div>
  </div>`;
}

/** Fotoğraf katmanı. mode: full (tam ekran, alttan koyulaşan), band (üst bant), dim (tam ekran, koyu) */
function photoLayer(photo, mode) {
  if (!photo) return "";
  const bandH = 600;
  if (mode === "band") {
    return `<img src="${photo.uri}" style="position:absolute;left:0;top:0;width:${W}px;height:${bandH}px;object-fit:cover" />
      <div style="position:absolute;left:0;top:0;width:${W}px;height:${bandH}px;background-image:linear-gradient(180deg, rgba(20,21,24,0.55) 0%, rgba(20,21,24,0.15) 35%, rgba(20,21,24,0.6) 75%, ${C.bg} 100%)"></div>`;
  }
  const grad = mode === "dim"
    ? `linear-gradient(180deg, rgba(20,21,24,0.82) 0%, rgba(20,21,24,0.78) 50%, rgba(20,21,24,0.94) 100%)`
    : `linear-gradient(180deg, rgba(20,21,24,0.55) 0%, rgba(20,21,24,0.05) 22%, rgba(20,21,24,0.4) 40%, rgba(20,21,24,0.93) 60%, ${C.bg} 100%)`;
  return `<img src="${photo.uri}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;object-fit:cover" />
    <div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background-image:${grad}"></div>`;
}

/** Ortak çerçeve: foto, üst bar, alt bar */
function frame({ cat, inner, index, total, footerRight, photo, photoMode }) {
  const k = CATEGORY[cat] ?? CATEGORY.genel;
  const grid = photo ? photoLayer(photo, photoMode) + (photo.credit ? `<div style="position:absolute;right:90px;bottom:24px;display:flex;font-family:Mono;font-size:15px;color:${C.text3}">${esc(photo.credit)}</div>` : "") : Array.from({ length: 9 }, (_, i) =>
    `<div style="position:absolute;left:${120 * (i + 1)}px;top:0;width:1px;height:${H}px;background:#1d1f23"></div>`).join("");
  // Instagram karoselde sağ üste kendi "1/N" sayacını koyar: bizimki solda, kategori etiketinin yanında.
  const counter = total > 1 ? `<div style="display:flex;font-family:Mono;font-size:24px;color:${C.text3};margin-left:18px">${String(index).padStart(2, "0")}/${String(total).padStart(2, "0")}</div>` : "";
  return `<div style="display:flex;flex-direction:column;width:${W}px;height:${H}px;background:${C.bg};position:relative;font-family:Body;color:${C.text}">
    ${grid}
    <div style="position:absolute;left:0;top:0;width:${W}px;height:10px;background:${k.color}"></div>
    <div style="display:flex;position:relative;justify-content:space-between;align-items:center;padding:64px 90px 0 90px">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="display:flex;width:14px;height:14px;background:${k.color}"></div>
        <div style="display:flex;font-family:Mono;font-size:24px;letter-spacing:3px;color:${k.color}">${esc(k.label)}</div>
        ${counter}
      </div>
    </div>
    <div style="display:flex;position:relative;flex-direction:column;flex:1;padding:0 90px">${inner}</div>
    <div style="display:flex;position:relative;justify-content:space-between;align-items:center;padding:0 90px 60px 90px">
      ${logo()}
      <div style="display:flex;font-family:Mono;font-size:22px;color:${C.text3}">${esc(footerRight ?? "")}</div>
    </div>
  </div>`;
}

const T = {
  cover: (s, ctx) => frame({ ...ctx, photoMode: "full", footerRight: ctx.total > 1 ? "KAYDIR →" : ctx.date, inner: `
    <div style="display:flex;flex-direction:column;justify-content:flex-end;flex:1;padding-bottom:64px">
      ${s.kicker ? `<div style="display:flex;font-family:Mono;font-size:28px;color:${C.text2};margin-bottom:28px">${esc(trUpper(s.kicker))}</div>` : ""}
      <div style="display:flex;font-family:Head;font-weight:800;font-size:${headSize(s.title)}px;line-height:0.95;letter-spacing:-1px;color:${C.text}">${esc(trUpper(s.title))}</div>
      ${s.subtitle ? `<div style="display:flex;font-size:38px;line-height:1.3;color:${C.text2};margin-top:36px">${esc(s.subtitle)}</div>` : ""}
    </div>` }),

  text: (s, ctx) => frame({ ...ctx, photoMode: "band", footerRight: ctx.source ? `KAYNAK: ${trUpper(ctx.source)}` : "", inner: `
    <div style="display:flex;flex-direction:column;justify-content:${ctx.photo ? "flex-end" : "center"};flex:1;padding-bottom:${ctx.photo ? 56 : 0}px">
      <div style="display:flex;font-family:Head;font-weight:800;font-size:${headSize(s.title, 92)}px;line-height:1;color:${C.text};margin-bottom:44px">${esc(trUpper(s.title))}</div>
      ${s.body ? `<div style="display:flex;font-size:40px;line-height:1.42;color:${C.text2}">${esc(s.body)}</div>` : ""}
      ${(s.bullets ?? []).map((b) => `<div style="display:flex;gap:24px;margin-top:26px;align-items:flex-start">
        <div style="display:flex;width:16px;height:16px;margin-top:18px;background:${(CATEGORY[ctx.cat] ?? CATEGORY.genel).color}"></div>
        <div style="display:flex;flex:1;font-size:38px;line-height:1.36;color:${C.text}">${esc(b)}</div></div>`).join("")}
    </div>` }),

  stat: (s, ctx) => frame({ ...ctx, photoMode: "dim", footerRight: ctx.source ? `KAYNAK: ${trUpper(ctx.source)}` : "", inner: `
    <div style="display:flex;flex-direction:column;justify-content:center;flex:1">
      <div style="display:flex;font-family:Mono;font-size:28px;letter-spacing:2px;color:${C.text3};margin-bottom:20px">${esc(trUpper(s.label ?? ""))}</div>
      <div style="display:flex;font-family:Head;font-weight:800;font-size:${s.value.length > 8 ? 190 : 260}px;line-height:0.9;color:${(CATEGORY[ctx.cat] ?? CATEGORY.genel).color}">${esc(s.value)}</div>
      ${s.body ? `<div style="display:flex;font-size:40px;line-height:1.4;color:${C.text2};margin-top:48px">${esc(s.body)}</div>` : ""}
    </div>` }),

  end: (s, ctx) => frame({ ...ctx, photoMode: "dim", footerRight: ctx.date, inner: `
    <div style="display:flex;flex-direction:column;justify-content:center;flex:1">
      <div style="display:flex;font-family:Head;font-weight:800;font-size:110px;line-height:0.95;color:${C.text}">${esc(trUpper(s.title ?? "Sence?"))}</div>
      ${s.body ? `<div style="display:flex;font-size:40px;line-height:1.4;color:${C.text2};margin-top:36px">${esc(s.body)}</div>` : ""}
      <div style="display:flex;gap:18px;margin-top:72px">
        ${["KAYDET", "PAYLAŞ", "TAKİP ET"].map((x) => `<div style="display:flex;border:2px solid ${C.border};padding:16px 26px;font-family:Mono;font-size:26px;color:${C.text}">${x}</div>`).join("")}
      </div>
      ${ctx.source ? `<div style="display:flex;font-family:Mono;font-size:24px;color:${C.text3};margin-top:56px">KAYNAK: ${esc(trUpper(ctx.source))}</div>` : ""}
    </div>` }),
};

/** Tek slayt -> JPEG Buffer */
export async function renderSlide(slide, ctx) {
  const tpl = T[slide.type] ?? T.text;
  const svg = await satori(html(tpl(slide, ctx)), { width: W, height: H, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  return sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

/** Ham foto -> 1080x1350 kırpılmış JPEG data URI */
async function toUri(buf) {
  const j = await sharp(buf).rotate().resize(W, H, { fit: "cover", position: "attention" }).modulate({ saturation: 0.85 }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${j.toString("base64")}`;
}

/** Post (slayt listesi) -> dosyalar; dosya yollarını döner. post.photos: [{buf, credit}] (slayt sırasıyla, eksikse döngüsel) */
export async function renderPost(post, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const total = post.slides.length;
  const photos = [];
  for (const p of post.photos ?? []) photos.push({ uri: await toUri(p.buf), credit: p.credit });
  const files = [];
  for (let i = 0; i < total; i++) {
    const photo = photos.length ? photos[i % photos.length] : null;
    const buf = await renderSlide(post.slides[i], { cat: post.category, index: i + 1, total, source: post.source, date: post.dateLabel, photo });
    const f = path.join(outDir, `${String(i + 1).padStart(2, "0")}.jpg`);
    fs.writeFileSync(f, buf);
    files.push(f);
  }
  return files;
}
