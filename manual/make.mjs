// Elle yazılmış postlar: süzgeç -> çizim (-> --publish ile yükleme + hazır post sırası)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { guardPost } from "../src/guard.mjs";
import { renderPost, renderStory } from "../src/render.mjs";
import { uploadFiles } from "../src/upload-github.mjs";
const UP = process.argv.includes("--publish");
const specs = JSON.parse(fs.readFileSync("manual/work/posts.json", "utf8"));
const q = JSON.parse(fs.readFileSync("state/manual-queue.json", "utf8"));
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
for (const s of specs) {
  const g = guardPost({ ...s.post, imageQueries: ["sport"] }, { sourceName: s.sourceName });
  if (!g.ok) { console.log("SÜZGEÇ:", s.id, g.reason); continue; }
  const post = { ...g.post, athleteName: s.post.athleteName, country: s.post.country, place: s.post.place };
  const photos = [];
  for (const p of s.photos) photos.push({ id: p.id ?? `event:${s.id}`, buf: await sharp(`manual/work/${p.file}`).jpeg({ quality: 92 }).toBuffer(), credit: p.credit, source: p.credit });
  const [y, m, d] = s.publishAt.slice(0, 10).split("-").map(Number);
  const outDir = path.join("out", "manual", s.id);
  fs.mkdirSync(outDir, { recursive: true });
  const files = await renderPost({ ...post, photos, category: s.category, source: s.sourceName, dateLabel: `${d} ${AY[m - 1]} ${y}` }, outDir);
  const storyFile = path.join(outDir, "story.jpg");
  await renderStory(files[0], storyFile);
  const caption = post.caption.replace(/(Kaynak:[^\n]*)/, `$1\nGörsel: ${s.photos.map((p) => p.credit).join(", ")}`);
  fs.writeFileSync(path.join(outDir, "caption.txt"), caption);
  console.log("çizildi:", s.id, files.length, "slayt");
  if (!UP) continue;
  if (q.some((x) => x.id === s.id)) { console.log("zaten sırada:", s.id); continue; }
  const urls = await uploadFiles(files, `manual/${s.id}`);
  const [story] = await uploadFiles([storyFile], `manual/${s.id}-story`);
  q.push({ id: s.id, publishAt: s.publishAt, urls, story, caption, photos: s.photos.map((p) => p.id ?? `event:${s.id}`), title: post.slides[0].title, kind: s.kind, category: s.category, eventName: post.eventName, srcUrl: s.srcUrl });
  console.log("sıraya alındı:", s.id, s.publishAt);
}
if (UP) fs.writeFileSync("state/manual-queue.json", JSON.stringify(q, null, 2) + "\n");
