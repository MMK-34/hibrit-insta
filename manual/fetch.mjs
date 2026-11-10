// Kaynak metni + aday fotoğraflar: node manual/fetch.mjs <haber-url> [<haber-url> ...]
// Çıktı: manual/work/s{k}.txt (başlık, URL, metin) ve manual/work/i{k}-{n}.jpg (en çok 4 fotoğraf, genişlik >= 700)
import "dotenv/config";
import fs from "node:fs";
import sharp from "sharp";
import { pageImages } from "../src/event-photos.mjs";
import { download } from "../src/images.mjs";
import { safeGet } from "../src/safe-net.mjs";
import { articleText, resolveNewsUrl } from "../src/collect.mjs";
fs.mkdirSync("manual/work", { recursive: true });
for (const [k, u0] of process.argv.slice(2).entries()) {
  const url = await resolveNewsUrl(u0).catch(() => u0);
  const text = await articleText(url).catch(() => "");
  const r = await safeGet(url, { timeout: 15000, maxBytes: 3e6, headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130" }, allowHttp: false }).catch(() => null);
  const html = r?.ok ? r.buf.toString("utf8") : "";
  const title = (html.match(/<title>([^<]*)<\/title>/i) ?? [])[1] ?? "";
  fs.writeFileSync(`manual/work/s${k}.txt`, `${title.trim()}\n${url}\n\n${text}`);
  let n = 0;
  for (const img of pageImages(html, url).slice(0, 10)) {
    const b = await download(img).catch(() => null);
    if (!b) continue;
    const m = await sharp(b).metadata();
    if ((m.width ?? 0) < 700) continue;
    fs.writeFileSync(`manual/work/i${k}-${n}.jpg`, await sharp(b).rotate().jpeg().toBuffer());
    if (++n >= 4) break;
  }
  console.log(`s${k}: ${text.length} karakter, ${n} fotoğraf | ${url}`);
}
