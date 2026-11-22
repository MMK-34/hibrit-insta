// Antigravity (agy) terminal modunda yalnızca sabit komutlara izin var; sayfa okumak için bu betik kullanılır.
// Kullanım (çalışma klasöründe): _agy/urls.txt dosyasına her satıra bir adres yaz, sonra `node scripts/agy-fetch.mjs` çalıştır.
// Çıktı: _agy/pages/NN.txt (adres, durum kodu ve sayfanın düz metni, en çok 40.000 karakter) ve _agy/pages/index.txt.
import fs from "node:fs";
import path from "node:path";

const dir = "_agy";
const list = fs.existsSync(path.join(dir, "urls.txt")) ? fs.readFileSync(path.join(dir, "urls.txt"), "utf8") : "";
const urls = list.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s)).slice(0, 40);
const out = path.join(dir, "pages");
fs.mkdirSync(out, { recursive: true });

const text = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<(br|p|div|li|h\d|tr)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

const index = [];
for (const [i, u] of urls.entries()) {
  const f = `${String(i + 1).padStart(2, "0")}.txt`;
  try {
    const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (hibrit-insta agy-fetch)", accept: "text/html,application/json,*/*" }, signal: AbortSignal.timeout(20000), redirect: "follow" });
    const body = await r.text();
    const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
    fs.writeFileSync(path.join(out, f), `URL: ${u}\nSON ADRES: ${r.url}\nDURUM: ${r.status}\nBASLIK: ${title}\n\n${text(body).slice(0, 40000)}\n`);
    index.push(`${f}\t${r.status}\t${u}`);
  } catch (e) {
    fs.writeFileSync(path.join(out, f), `URL: ${u}\nHATA: ${String(e?.message ?? e).slice(0, 200)}\n`);
    index.push(`${f}\tHATA\t${u}`);
  }
}
fs.writeFileSync(path.join(out, "index.txt"), index.join("\n") + "\n");
console.log(`${urls.length} adres okundu -> ${out}`);
