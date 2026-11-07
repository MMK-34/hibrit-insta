// Profil kiti: öne çıkan hikâyeler için 9:16 tanıtım kartları (marka şablonu cf/public/instagram/story-sablon.png ile aynı dil).
// Çıktı: out/profil-kiti/  (hikâye kartları + öne çıkan kapakları + profil fotoğrafı + KURULUM.md)
//   node src/story-cards.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KIT = path.resolve(ROOT, "..", "public", "instagram");
const OUT = path.join(ROOT, "out", "profil-kiti");
const W = 1080, H = 1920;
const C = { ink: "#0e0f12", paper: "#f3efe7", red: "#e8321e", text2: "#cfc9be", text3: "#8e897f" };
const font = (f) => fs.readFileSync(path.join(ROOT, "fonts", f));
const FONTS = [
  { name: "Body", data: font("Inter-400.ttf"), weight: 400 },
  { name: "Body", data: font("Inter-700.ttf"), weight: 700 },
  { name: "Head", data: font("BigShouldersDisplay-ExtraBold.ttf"), weight: 800 },
];

// Öne çıkanlar: ad (Instagram'da görünen, kısa), kart metni, kapak dosyası
const HIGHLIGHTS = [
  { file: "haber", name: "Haber", label: "HABER", title: "Son haberler", body: "HYROX, CrossFit ve koşu dünyasından günün haberleri. Her paylaşımın sonunda kaynağı var.", cover: "kapak-haber.png" },
  { file: "hyrox", name: "HYROX", label: "HYROX", title: "HYROX", body: "Yarış duyuruları, sonuçlar, istasyon kuralları ve kategori rehberleri.", cover: "kapak-hyrox.png" },
  { file: "crossfit", name: "CrossFit", label: "CROSSFIT", title: "CrossFit", body: "Open, Games ve Türkiye'deki throwdown'lar: duyurular, sonuçlar, benchmark WOD'lar.", cover: "kapak-crossfit.png" },
  { file: "takvim", name: "Takvim", label: "TAKVİM", title: "Yarış takvimi", body: "Türkiye'de ve yakın ülkelerde yaklaşan yarışlar, kayıt tarihleri ve ön elemeler.", cover: "kapak-takvim.png" },
  { file: "wod", name: "WOD", label: "ANTRENMAN", title: "Yarışma WOD'ları", body: "Yarışmalarda çıkan antrenmanlar ve hazırlık için bilgi postları.", cover: "kapak-wod.png" },
  { file: "arsiv", name: "Arşiv", label: "ARŞİV", title: "Yarışma arşivi", body: "Geçmiş edisyonlar, kategoriler ve istatistikler. Veriye dayalı, kaynaklı.", cover: "kapak-arsiv.png" },
];

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const up = (s = "") => String(s).replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();

async function logo() {
  const svg = (f, h) => sharp(Buffer.from(fs.readFileSync(path.join(ROOT, "assets", f), "utf8").replace(/currentColor/g, C.paper)), { density: 400 }).resize({ height: h }).png().toBuffer();
  const [m, w] = await Promise.all([svg("logo-mark.svg", 120), svg("wordmark.svg", 84)]);
  const mm = await sharp(m).metadata(), wm = await sharp(w).metadata();
  return `<div style="display:flex;align-items:center;gap:18px">
    <img src="data:image/png;base64,${m.toString("base64")}" style="width:${mm.width / 2}px;height:${mm.height / 2}px" />
    <img src="data:image/png;base64,${w.toString("base64")}" style="width:${wm.width / 2}px;height:${wm.height / 2}px" /></div>`;
}

// Hikâye güvenli alanı: üst ~250px ve alt ~340px arayüzün altında kalır; içerik 280–1560px arasında.
function card(h, logoHtml) {
  return `<div style="display:flex;width:${W}px;height:${H}px;background:${C.ink};font-family:Body;color:${C.paper}"><div style="display:flex;flex-direction:column;width:920px;height:${H - 640}px;margin:280px 80px 360px 80px">
    ${logoHtml}
    <div style="display:flex;width:920px;height:6px;background:${C.red};margin-top:56px"></div>
    <div style="display:flex;font-weight:700;font-size:34px;letter-spacing:3px;color:${C.red};margin-top:44px">${esc(up(h.label))}</div>
    <div style="display:flex;font-family:Head;font-weight:800;font-size:${h.title.length > 12 ? 150 : 190}px;line-height:0.95;margin-top:18px">${esc(up(h.title))}</div>
    <div style="display:flex;font-size:44px;line-height:1.4;color:${C.text2};margin-top:44px">${esc(h.body)}</div>
    <div style="display:flex;flex:1"></div>
    <div style="display:flex;width:70px;height:8px;background:${C.red}"></div>
    <div style="display:flex;justify-content:space-between;margin-top:26px;font-size:38px">
      <div style="display:flex;color:${C.text2}">Takip et, haber kaçırma</div>
      <div style="display:flex;color:${C.red};font-weight:700">hibritportal</div>
    </div>
  </div></div>`;
}

fs.mkdirSync(OUT, { recursive: true });
const L = await logo();
for (const [i, h] of HIGHLIGHTS.entries()) {
  const svg = await satori(html(card(h, L)), { width: W, height: H, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  await sharp(png).jpeg({ quality: 92 }).toFile(path.join(OUT, `${i + 1}-hikaye-${h.file}.jpg`));
  if (fs.existsSync(path.join(KIT, h.cover))) fs.copyFileSync(path.join(KIT, h.cover), path.join(OUT, `${i + 1}-kapak-${h.file}.png`));
}
for (const f of ["profil.png", "ilk-gonderi.png"]) if (fs.existsSync(path.join(KIT, f))) fs.copyFileSync(path.join(KIT, f), path.join(OUT, f));

fs.writeFileSync(path.join(OUT, "KURULUM.md"), `# @hibritportal profil kurulumu (telefondan ~5 dakika)

Bio ve kategori hazır (bio Graph API ile doğrulandı). Instagram'ın API'si profil fotoğrafını ve öne çıkanları değiştirmeye izin vermediği için bu adımlar uygulamadan yapılır.

1. **Profil fotoğrafı:** Profili düzenle > Fotoğrafı değiştir > \`profil.png\`
2. **Ad:** Profili düzenle > Ad: \`Hibrit Portal\`
3. **Öne çıkanlar** (her biri için): Hikâye olarak \`N-hikaye-*.jpg\` paylaş > Profil > "+" Yeni öne çıkan > hikâyeyi seç > Adı yaz > Kapağı düzenle > \`N-kapak-*.png\`
${HIGHLIGHTS.map((h, i) => `   - ${i + 1}. **${h.name}**: \`${i + 1}-hikaye-${h.file}.jpg\` + kapak \`${i + 1}-kapak-${h.file}.png\``).join("\n")}
4. **İlk gönderi (isteğe bağlı):** \`ilk-gonderi.png\` tanıtım postu olarak sabitlenebilir.

Bot yayına alındıktan sonra yeni haberler otomatik paylaşılır; öne çıkanlara eklemek isteğe bağlıdır.
`);
console.log("hazır:", OUT, fs.readdirSync(OUT).length, "dosya");
