// Bilgi postu için stok fotoğraf adayları (Pixabay/Openverse/yerel kütüphane; Claude çağrısı yok):
//   node manual/stock.mjs <kategori> "<ingilizce sorgu 1>" ["<sorgu 2>"]
// Çıktı: manual/work/st-{n}.jpg + id listesi. Son kullanılan fotoğraflar (state) tekrar gelmez.
import "dotenv/config";
import fs from "node:fs";
import sharp from "sharp";
import { findImages } from "../src/images.mjs";
fs.mkdirSync("manual/work", { recursive: true });
const [category = "genel", ...queries] = process.argv.slice(2);
const st = JSON.parse(fs.readFileSync("state/posted.json", "utf8"));
const used = new Set([...st.posts.flatMap((p) => p.photos ?? []), ...st.posts.slice(-10).flatMap((p) => p.photos ?? [])]);
const got = await findImages(queries, 6, category, used);
for (const [n, p] of got.entries()) {
  fs.writeFileSync(`manual/work/st-${n}.jpg`, await sharp(p.buf).rotate().jpeg().toBuffer());
  console.log(`st-${n}.jpg | id=${p.id} | ${p.credit ?? ""}`);
}
