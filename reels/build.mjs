// Haftalık bülten Reels (1080x1920) için HyperFrames kompozisyonu üretir.
// Girdi: <proje>/bulletin.json  { date, items: [{ kicker, headline, photo, photo2? }], intro: {title, sub}, outro: {...} }
//        <proje>/assets/v{i}.mp3 + <proje>/align/a{i}.json (ElevenLabs with-timestamps hizalaması; 0 = giriş, 1..n = haberler, n+1 = kapanış)
// Çıktı: <proje>/index.html  (npx hyperframes check / render ile işlenir)
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("kullanım: node reels/build.mjs <proje-klasörü>");
const B = JSON.parse(fs.readFileSync(path.join(dir, "bulletin.json"), "utf8"));
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const up = (s) => String(s).toLocaleUpperCase("tr");
const r2 = (x) => Math.round(x * 100) / 100;

const PRE = 0.35, HOLD = 1.3; // ses öncesi boşluk, ses sonrası bekleme
const segs = [];
let t = 0;
const n = B.items.length;
for (let i = 0; i <= n + 1; i++) {
  const al = JSON.parse(fs.readFileSync(path.join(dir, "align", `a${i}.json`), "utf8"));
  const voiceLen = al.character_end_times_seconds.at(-1);
  // kelimeler
  const words = [];
  let cur = null;
  al.characters.forEach((ch, k) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { text: "", start: al.character_start_times_seconds[k] };
    cur.text += ch; cur.end = al.character_end_times_seconds[k];
  });
  if (cur) words.push(cur);
  // gruplar: en çok 4 kelime; noktalama ya da 150 ms duraksamada kırılır
  const groups = [];
  let g = [];
  words.forEach((w, k) => {
    g.push(w);
    const next = words[k + 1];
    if (g.length >= 3 || /[.,!?;:]$/.test(w.text) || (next && next.start - w.end >= 0.15) || !next) { groups.push(g); g = []; }
  });
  const dur = (i === 0 ? 0.15 : PRE) + voiceLen + HOLD;
  const voiceAt = t + (i === 0 ? 0.15 : PRE);
  segs.push({ i, start: t, dur, voiceAt, voiceLen, groups });
  t += dur;
}
const TOTAL = r2(t + 0.4);

const css = `
@font-face { font-family: "Head"; src: url("assets/fonts/BigShouldersDisplay-ExtraBold.ttf"); font-weight: 800; }
@font-face { font-family: "Body"; src: url("assets/fonts/Inter-600.ttf"); font-weight: 600; }
@font-face { font-family: "Body"; src: url("assets/fonts/Inter-700.ttf"); font-weight: 700; }
:root { --ink: #0e0f12; --paper: #f3efe7; --red: #e8321e; --text2: #cfc9be; --text3: #8e897f; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--ink); }
#root { position: relative; width: 1080px; height: 1920px; background: var(--ink); font-family: "Body", sans-serif; color: var(--paper); overflow: hidden; }
.scene { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; background: var(--ink); }
.ph { position: absolute; left: 0; top: 140px; width: 1080px; height: 1200px; overflow: hidden; }
.ph img { position: absolute; left: -80px; top: -60px; width: 1240px; height: 1320px; object-fit: cover; }
.fade { position: absolute; left: 0; top: 140px; width: 1080px; height: 1200px;
  background: linear-gradient(180deg, rgba(14,15,18,0.85) 0%, rgba(14,15,18,0) 18%, rgba(14,15,18,0) 52%, rgba(14,15,18,0.7) 78%, #0e0f12 100%); }
.bar { position: absolute; left: 90px; top: 186px; width: 900px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 14px; }
.brand img.mk { height: 40px; } .brand img.wm { height: 34px; }
.count { font-weight: 700; font-size: 30px; letter-spacing: 4px; color: var(--paper); background: rgba(14,15,18,0.6); padding: 8px 18px; border-radius: 999px; }
.count b { color: var(--red); }
.txt { position: absolute; left: 90px; top: 1060px; width: 900px; }
.redline { width: 110px; height: 10px; background: var(--red); margin-bottom: 24px; }
.kicker { font-weight: 700; font-size: 32px; letter-spacing: 4px; color: var(--red); margin-bottom: 18px; }
.head { font-family: "Head", sans-serif; font-weight: 800; font-size: 92px; line-height: 0.98; color: var(--paper); }
.cap { position: absolute; left: 0; top: 930px; width: 1080px; text-align: center; overflow: visible; }
.cap span { display: inline-block; font-weight: 700; font-size: 50px; line-height: 1.2; color: var(--paper); background: rgba(14,15,18,0.62); padding: 10px 24px; border-radius: 14px; max-width: 900px; }
.intro .title { position: absolute; left: 90px; top: 1000px; width: 900px; font-family: "Head", sans-serif; font-weight: 800; font-size: 170px; line-height: 0.9; }
.intro .sub { position: absolute; left: 90px; top: 1340px; width: 900px; font-weight: 700; font-size: 34px; letter-spacing: 5px; color: var(--text2); }
.strips { position: absolute; left: 0; top: 200px; width: 1080px; height: 760px; display: flex; gap: 8px; }
.strips div { flex: 1; overflow: hidden; position: relative; }
.strips img { position: absolute; left: -200px; top: 0; width: 620px; height: 760px; object-fit: cover; }
.outro .big { position: absolute; left: 90px; top: 760px; width: 900px; font-family: "Head", sans-serif; font-weight: 800; font-size: 120px; line-height: 0.95; }
.outro .handle { position: absolute; left: 90px; top: 1060px; font-weight: 700; font-size: 44px; color: var(--red); }
.outro .logo { position: absolute; left: 90px; top: 560px; display: flex; align-items: center; gap: 20px; }
.outro .logo .mk { height: 90px; } .outro .logo .wm { height: 76px; }
`;

const brand = `<div class="brand"><img class="mk" src="assets/logo-mark.svg" /><img class="wm" src="assets/wordmark.svg" /></div>`;
let html = "", js = "";
const capHtml = (s) => s.groups.map((g, k) => {
  const st = r2(s.voiceAt + g[0].start - 0.05), en = r2(s.voiceAt + g.at(-1).end + 0.12);
  const next = s.groups[k + 1];
  const end = next ? Math.min(en, r2(s.voiceAt + next[0].start - 0.06)) : en;
  js += `tl.fromTo("#c${s.i}_${k} span", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.14, ease: "power2.out" }, ${st});\n`;
  return `<div id="c${s.i}_${k}" class="clip cap" data-start="${st}" data-duration="${r2(end - st)}" data-track-index="3"><span>${esc(g.map((w) => w.text).join(" "))}</span></div>`;
}).join("\n");

for (const s of segs) {
  const st = r2(s.start), du = r2(s.dur + (s.i === n + 1 ? 0.4 : 0.3)); // sonraki sahne üstüne biner (0.3 s geçiş)
  if (s.i === 0) {
    html += `<div id="s0" class="clip scene intro" data-start="${st}" data-duration="${du}" data-track-index="1" style="z-index:1">
  <div class="strips">${B.items.slice(0, 4).map((it, k) => `<div><img id="st${k}" src="assets/${esc(it.photo)}" /></div>`).join("")}</div>
  <div class="fade" style="height:760px;background:linear-gradient(180deg, rgba(14,15,18,0.75) 0%, rgba(14,15,18,0) 25%, rgba(14,15,18,0.4) 70%, #0e0f12 100%)"></div>
  <div class="bar">${brand}</div>
  <div class="title" id="introTitle">${esc(up(B.intro.title)).replace(/\n/g, "<br/>")}</div>
  <div class="sub" id="introSub">${esc(up(B.intro.sub))}</div>
</div>\n`;
    js += `tl.fromTo("#introTitle", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.1);\n`;
    js += `tl.fromTo("#introSub", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);\n`;
    B.items.slice(0, 4).forEach((_, k) => { js += `tl.fromTo("#st${k}", { scale: 1.15, y: ${k % 2 ? 40 : -40} }, { scale: 1.02, y: 0, duration: ${r2(s.dur + 0.3)}, ease: "none" }, 0);\n`; });
  } else if (s.i === n + 1) {
    html += `<div id="s${s.i}" class="clip scene outro" data-start="${st}" data-duration="${du}" data-track-index="1" style="z-index:${s.i + 1}">
  <div class="logo" id="oLogo"><img class="mk" src="assets/logo-mark.svg" /><img class="wm" src="assets/wordmark.svg" /></div>
  <div class="big" id="oBig">${esc(up(B.outro.title)).replace(/\n/g, "<br/>")}</div>
  <div class="handle" id="oHandle">${esc(B.outro.handle)}</div>
</div>\n`;
    js += `tl.fromTo("#s${s.i}", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${st});\n`;
    js += `tl.fromTo("#oBig", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${r2(st + 0.2)});\n`;
    js += `tl.fromTo("#oHandle", { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${r2(st + 0.6)});\n`;
  } else {
    const it = B.items[s.i - 1];
    html += `<div id="s${s.i}" class="clip scene" data-start="${st}" data-duration="${du}" data-track-index="1" style="z-index:${s.i + 1}">
  <div class="ph"><img id="im${s.i}" src="assets/${esc(it.photo)}" /></div>
  <div class="fade"></div>
  <div class="bar">${brand}<div class="count"><b>${s.i}</b>/${n}</div></div>
  <div class="txt"><div class="redline" id="rl${s.i}"></div><div class="kicker">${esc(up(it.kicker))}</div><div class="head" id="h${s.i}">${esc(up(it.headline))}</div></div>
</div>\n`;
    js += `tl.fromTo("#s${s.i}", { x: 1080 }, { x: 0, duration: 0.3, ease: "power3.out" }, ${st});\n`;
    js += `tl.fromTo("#im${s.i}", { scale: 1.0 }, { scale: 1.09, duration: ${du}, ease: "none" }, ${st});\n`;
    js += `tl.fromTo("#rl${s.i}", { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, ${r2(st + 0.25)});\n`;
    js += `tl.fromTo("#h${s.i}", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, ${r2(st + 0.3)});\n`;
  }
  html += `<audio id="v${s.i}" src="assets/v${s.i}.mp3" data-start="${r2(s.voiceAt)}" data-duration="${r2(s.voiceLen + 0.1)}" data-track-index="5" data-volume="1"></audio>\n`;
}
// Altyazı yalnızca haber sahnelerinde (giriş ve kapanışta başlık zaten aynı sözü taşıyor)
const caps = segs.filter((s) => s.i >= 1 && s.i <= n).map(capHtml).join("\n");

const out = `<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>${css}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
${html}
<div id="caps" style="position:absolute;left:0;top:0;width:1080px;height:1920px;z-index:50">
${caps}
</div>
<audio id="music" src="assets/music.mp3" data-start="0" data-duration="${TOTAL}" data-track-index="6" data-volume="0.22" data-fade-out="2.5"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, "index.html"), out);
console.log("index.html yazıldı; süre", TOTAL, "s; sahne", segs.length);
