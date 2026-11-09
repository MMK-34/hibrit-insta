// Haftalık bülten Reels (1080x1920) için HyperFrames kompozisyonu üretir (tasarım v2: tam ekran video/foto).
// Girdi: <proje>/bulletin.json
//   { date, intro: {title, sub}, outro: {title, handle},
//     items: [{ kicker, headline, photo, clips?: [{ video, from, dur? }], stat?, statLabel? }] }
//   clips: sahnede sırayla oynayan video parçaları (from: kaynaktaki başlangıç sn, dur: süre; sonuncu sahne sonuna kadar sürer)
//   <proje>/assets/v{i}.mp3 + <proje>/align/a{i}.json (ElevenLabs with-timestamps; 0 = giriş, 1..n = haberler, n+1 = kapanış)
//   <proje>/assets/music.mp3, whoosh.mp3, hit.mp3
// Çıktı: <proje>/index.html  (npx hyperframes check / render)
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("kullanım: node reels/build.mjs <proje-klasörü>");
const B = JSON.parse(fs.readFileSync(path.join(dir, "bulletin.json"), "utf8"));
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const up = (s) => String(s).toLocaleUpperCase("tr");
const r2 = (x) => Math.round(x * 100) / 100;
const n = B.items.length;

const PRE = 0.25, HOLD = 0.55, X = 0.2; // ses öncesi boşluk, ses sonrası bekleme, geçiş
const segs = [];
let t = 0;
for (let i = 0; i <= n + 1; i++) {
  const al = JSON.parse(fs.readFileSync(path.join(dir, "align", `a${i}.json`), "utf8"));
  const voiceLen = al.character_end_times_seconds.at(-1);
  const words = [];
  let cur = null;
  al.characters.forEach((ch, k) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { text: "", start: al.character_start_times_seconds[k] };
    cur.text += ch; cur.end = al.character_end_times_seconds[k];
  });
  if (cur) words.push(cur);
  const groups = [];
  let g = [];
  words.forEach((w, k) => {
    g.push(w);
    const next = words[k + 1];
    if (g.length >= 3 || /[.,!?;:]$/.test(w.text) || (next && next.start - w.end >= 0.15) || !next) { groups.push(g); g = []; }
  });
  const pre = i === 0 ? 0.2 : PRE;
  const dur = pre + voiceLen + HOLD;
  segs.push({ i, start: t, dur, voiceAt: t + pre, voiceLen, groups });
  t += dur;
}
const TOTAL = r2(t + 0.3);

const css = `
@font-face { font-family: "Head"; src: url("assets/fonts/BigShouldersDisplay-ExtraBold.ttf"); font-weight: 800; }
@font-face { font-family: "Body"; src: url("assets/fonts/Inter-600.ttf"); font-weight: 600; }
@font-face { font-family: "Body"; src: url("assets/fonts/Inter-700.ttf"); font-weight: 700; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: #0e0f12; }
#root { position: relative; width: 1080px; height: 1920px; background: #0e0f12; font-family: "Body", sans-serif; color: #f3efe7; overflow: hidden; }
.scene { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; background: #0e0f12; }
.media { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; }
.media .mv { position: absolute; left: -60px; top: -100px; width: 1200px; height: 2120px; will-change: transform; backface-visibility: hidden; }
.rv { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }
.media img, .media video { position: absolute; left: 0; top: 0; width: 1200px; height: 2120px; object-fit: cover; }
.shade { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px;
  background: linear-gradient(180deg, rgba(14,15,18,0.7) 0%, rgba(14,15,18,0) 16%, rgba(14,15,18,0) 36%, rgba(14,15,18,0.55) 50%, rgba(14,15,18,0.9) 62%, #0e0f12 78%); }
.top { position: absolute; left: 70px; top: 176px; width: 940px; }
.prog { display: flex; gap: 10px; width: 940px; height: 8px; }
.prog div { flex: 1; height: 8px; border-radius: 4px; background: rgba(243,239,231,0.28); overflow: hidden; position: relative; }
.prog div i { position: absolute; left: 0; top: 0; width: 100%; height: 8px; background: #f3efe7; transform-origin: left center; }
.brandrow { display: flex; align-items: center; justify-content: space-between; margin-top: 26px; }
.brand { display: flex; align-items: center; gap: 12px; }
.brand img.mk { height: 36px; } .brand img.wm { height: 30px; }
.tag { font-weight: 700; font-size: 26px; letter-spacing: 4px; color: #f3efe7; }
.stat { display: flex; align-items: flex-end; gap: 22px; margin-top: 22px; }
.stat .num { font-family: "Head", sans-serif; font-weight: 800; font-size: 150px; line-height: 1; height: 150px; color: #e8321e; }
.stat .lab { font-weight: 700; font-size: 30px; letter-spacing: 3px; color: #cfc9be; padding-bottom: 18px; }
.txt { position: absolute; left: 70px; top: 880px; width: 940px; }
.kick { display: inline-block; background: #e8321e; color: #f3efe7; font-weight: 700; font-size: 28px; letter-spacing: 3px; padding: 10px 18px; border-radius: 6px; margin-bottom: 22px; }
.head { font-family: "Head", sans-serif; font-weight: 800; font-size: 96px; line-height: 0.95; color: #f3efe7; }
.head span { display: inline-block; margin-right: 22px; }
.cap { position: absolute; left: 0; top: 740px; width: 1080px; text-align: center; overflow: visible; }
.cap span { display: inline-block; font-weight: 700; font-size: 48px; line-height: 1.2; color: #0e0f12; background: #f3efe7; padding: 8px 22px; border-radius: 12px; max-width: 920px; }
.wipe { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; background: #e8321e; }
.intro .big { position: absolute; left: 70px; top: 980px; width: 940px; font-family: "Head", sans-serif; font-weight: 800; font-size: 190px; line-height: 0.88; }
.intro .sub { position: absolute; left: 70px; top: 1350px; font-weight: 700; font-size: 32px; letter-spacing: 5px; color: #cfc9be; }
.grid { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
.grid div { position: absolute; overflow: hidden; }
.grid img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; will-change: transform; }
.outro .logo { position: absolute; left: 70px; top: 640px; }
.outro .logo .mk { height: 96px; } .outro .logo .wm { height: 80px; }
.outro .big { position: absolute; left: 70px; top: 800px; width: 940px; font-family: "Head", sans-serif; font-weight: 800; font-size: 150px; line-height: 0.92; }
.outro .handle { position: absolute; left: 70px; top: 1110px; font-weight: 700; font-size: 46px; color: #e8321e; }
`;

const brand = `<div class="brand"><img class="mk" src="assets/logo-mark.svg" /><img class="wm" src="assets/wordmark.svg" /></div>`;
let html = "", js = "", sfx = "";

/** Sahnenin arka planı: video parçaları sırayla (yoksa fotoğraf). */
let rootVideos = "";
function mediaHtml(it, i, st, du) {
  if (!it.clips?.length) return `<img src="assets/${esc(it.photo)}" />`;
  let at = r2(st + 0.1), out = "";
  du = r2(du - 0.1);
  it.clips.forEach((c, k) => {
    const last = k === it.clips.length - 1;
    const d = last ? r2(st + du - at) : r2(Math.min(c.dur ?? 3, st + du - at));
    if (d <= 0) return;
    rootVideos += `<video id="m${i}_${k}" class="clip rv" src="assets/${esc(c.video)}" data-start="${r2(at)}" data-duration="${d}" data-media-start="${c.from ?? 0}" data-track-index="${9 + (k % 2)}" muted playsinline style="z-index:${i + 1}"></video>
`;
    at += d;
  });
  return "";
}

for (const s of segs) {
  const st = r2(s.start), du = r2(s.dur + X);
  if (s.i === 0) {
    // Giriş: 3 haber görselinden ızgara + büyük başlık (ilk kare boş değil: kanca)
    const cells = [[0, 0, 536, 940], [544, 0, 536, 620], [544, 628, 536, 312]];
    html += `<div id="s0" class="clip scene intro" data-start="${st}" data-duration="${du}" data-track-index="1" style="z-index:1">
  <div class="grid">${B.items.slice(0, 3).map((it, k) => `<div style="left:${cells[k][0]}px;top:${cells[k][1]}px;width:${cells[k][2]}px;height:${cells[k][3]}px"><img id="g${k}" src="assets/${esc(it.photo)}" /></div>`).join("")}</div>
  <div class="shade"></div>
  <div class="top">${brand}</div>
  <div class="big">${up(B.intro.title).split(/\n/).map((l, k) => `<div id="ib${k}">${esc(l)}</div>`).join("")}</div>
  <div class="sub" id="is">${esc(up(B.intro.sub))}</div>
</div>\n`;
    B.items.slice(0, 3).forEach((_, k) => { js += `tl.fromTo("#g${k}", { scale: 1.25, force3D: true }, { scale: 1.0, force3D: true, duration: ${du}, ease: "power1.out" }, 0);\n`; });
    up(B.intro.title).split(/\n/).forEach((_, k) => { js += `tl.fromTo("#ib${k}", { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.6)" }, ${r2(0.05 + k * 0.18)});\n`; });
    js += `tl.fromTo("#is", { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.6);\n`;
  } else if (s.i === n + 1) {
    html += `<div id="s${s.i}" class="clip scene outro" data-start="${st}" data-duration="${r2(s.dur + 0.3)}" data-track-index="1" style="z-index:${s.i + 1}">
  <div class="logo" id="oL"><div style="display:flex;align-items:center;gap:20px"><img class="mk" src="assets/logo-mark.svg" /><img class="wm" src="assets/wordmark.svg" /></div></div>
  <div class="big" id="oB">${up(B.outro.title).split(/\n/).map((l) => esc(l)).join("<br/>")}</div>
  <div class="handle" id="oH">${esc(B.outro.handle)}</div>
</div>\n`;
    js += `tl.fromTo("#oL", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, ${r2(st + 0.35)});\n`;
    js += `tl.fromTo("#oB", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" }, ${r2(st + 0.5)});\n`;
    js += `tl.fromTo("#oH", { opacity: 0 }, { opacity: 1, duration: 0.4 }, ${r2(st + 0.9)});\n`;
  } else {
    const it = B.items[s.i - 1];
    const words = up(it.headline).split(/\s+/);
    const vid = !!it.clips?.length;
    const mh = mediaHtml(it, s.i, st, du);
    html += rootVideos; rootVideos = "";
    html += `<div id="s${s.i}" class="clip scene" data-start="${st}" data-duration="${du}" data-track-index="1" style="z-index:${s.i + 1}${vid ? ";background:transparent" : ""}">
  <div class="media"${vid ? ' style="display:none"' : ""}><div class="mv" id="m${s.i}">${mh}</div></div>
  <div class="shade"></div>
  <div class="top"><div class="prog">${B.items.map((_, k) => `<div>${k < s.i - 1 ? '<i style="transform:scaleX(1)"></i>' : k === s.i - 1 ? `<i id="pg${s.i}"></i>` : ""}</div>`).join("")}</div>
    <div class="brandrow">${brand}<div class="tag">${s.i}/${n}</div></div></div>
  <div class="txt"><div class="kick" id="k${s.i}">${esc(up(it.kicker))}</div>
    <div class="head">${words.map((w, k) => `<span id="h${s.i}_${k}">${esc(w)}</span>`).join("")}</div>
    ${it.stat ? `<div class="stat"><div class="num" id="sn${s.i}">${esc(it.stat)}</div>${it.statLabel ? `<div class="lab" id="sl${s.i}">${esc(up(it.statLabel))}</div>` : ""}</div>` : ""}</div>
</div>\n`;
    sfx += `<audio id="sw${s.i}" src="assets/whoosh.mp3" data-start="${r2(Math.max(0, st - 0.05))}" data-duration="0.6" data-track-index="7" data-volume="0.45"></audio>\n`;
    // videoda hafif, fotoğrafta belirgin yakınlaşma
    const z = it.clips?.length ? 1.05 : 1.12;
    if (!vid) js += `tl.fromTo("#m${s.i}", { scale: 1.0, x: ${s.i % 2 ? -20 : 20}, force3D: true }, { scale: ${z}, x: ${s.i % 2 ? 20 : -20}, force3D: true, duration: ${du}, ease: "none" }, ${st});\n`;
    js += `tl.fromTo("#pg${s.i}", { scaleX: 0 }, { scaleX: 1, duration: ${r2(s.dur)}, ease: "none" }, ${st});\n`;
    js += `tl.fromTo("#k${s.i}", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.22, ease: "power3.out" }, ${r2(st + 0.15)});\n`;
    words.forEach((_, k) => { js += `tl.fromTo("#h${s.i}_${k}", { opacity: 0, y: 70, scale: 1.15 }, { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: "back.out(1.8)" }, ${r2(st + 0.22 + k * 0.06)});\n`; });
    if (it.stat) {
      const sAt = r2(st + 0.5);
      js += `tl.fromTo("#sn${s.i}", { opacity: 0, scale: 0.6, transformOrigin: "left bottom" }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, ${sAt});\n`;
      if (it.statLabel) js += `tl.fromTo("#sl${s.i}", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${r2(sAt + 0.3)});\n`;
      const plain = String(it.stat).replace(/\./g, "");
      if (/^\d+$/.test(plain)) js += `{ const o = { v: 0 }, el = document.getElementById("sn${s.i}"); tl.fromTo(o, { v: 0 }, { v: ${Number(plain)}, duration: 0.9, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("tr-TR"); } }, ${sAt}); }\n`;
      sfx += `<audio id="sh${s.i}" src="assets/hit.mp3" data-start="${sAt}" data-duration="0.5" data-track-index="8" data-volume="0.5"></audio>\n`;
    }
  }
  if (s.i >= 1) {
    // geçiş: önceki sahnenin üstünden kırmızı silme, yeni sahne silmenin arkasında belirir
    html += `<div id="w${s.i}" class="clip wipe" data-start="${r2(st - 0.05)}" data-duration="0.32" data-track-index="2" style="z-index:40"></div>\n`;
    js += `tl.fromTo("#w${s.i}", { x: -1080 }, { x: 1080, duration: 0.32, ease: "power3.inOut" }, ${r2(st - 0.05)});\n`;
    js += `tl.fromTo("#s${s.i}", { opacity: 0 }, { opacity: 1, duration: 0.01 }, ${r2(st + 0.1)});\n`;
  }
  html += `<audio id="v${s.i}" src="assets/v${s.i}.mp3" data-start="${r2(s.voiceAt)}" data-duration="${r2(s.voiceLen)}" data-track-index="5" data-volume="1"></audio>\n`;
}

let caps = "";
for (const s of segs.filter((x) => x.i >= 1 && x.i <= n)) {
  s.groups.forEach((g, k) => {
    const st = r2(s.voiceAt + g[0].start - 0.05);
    const next = s.groups[k + 1];
    const en = r2(s.voiceAt + g.at(-1).end + 0.12);
    const end = next ? Math.min(en, r2(s.voiceAt + next[0].start - 0.06)) : en;
    js += `tl.fromTo("#c${s.i}_${k} span", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out" }, ${st});\n`;
    caps += `<div id="c${s.i}_${k}" class="clip cap" data-start="${st}" data-duration="${r2(end - st)}" data-track-index="3"><span>${esc(g.map((w) => w.text).join(" "))}</span></div>\n`;
  });
}

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
${sfx}
<audio id="music" src="assets/music.mp3" data-start="0" data-duration="${TOTAL}" data-track-index="6" data-volume="0.2" data-fade-out="2.5"></audio>
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
