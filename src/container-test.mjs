// Yayınlamadan test: örnek görseli media dalına yükler, Instagram container oluşturur, FINISHED bekler.
// media_publish ÇAĞIRMAZ (hesapta hiçbir şey paylaşılmaz).
import "dotenv/config";
import { uploadFiles } from "./upload-github.mjs";

const urls = await uploadFiles(["out/test/single/01.jpg"], "_test");
console.log("url:", urls[0]);
const t = process.env.IG_ACCESS_TOKEN;
const host = t.startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com";
const qs = new URLSearchParams({ image_url: urls[0], caption: "test", access_token: t });
const c = await (await fetch(`https://${host}/v23.0/${process.env.IG_USER_ID}/media`, { method: "POST", body: qs })).json();
console.log("container:", c.id ? "oluştu" : JSON.stringify(c));
for (let i = 0; c.id && i < 15; i++) {
  const s = await (await fetch(`https://${host}/v23.0/${c.id}?fields=status_code&access_token=${t}`)).json();
  console.log("durum:", s.status_code);
  if (s.status_code !== "IN_PROGRESS") break;
  await new Promise((r) => setTimeout(r, 3000));
}
