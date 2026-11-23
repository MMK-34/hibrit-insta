// Kaynak dosyalarda gizli kontrol karakteri (NUL, backspace vb.) varsa çıkış kodu 1 (G12: "\b" backspace'e dönüşüp Pixabay'i bozmuştu).
// Sekme, satır sonu ve satır başı serbest.
import fs from "node:fs";
import path from "node:path";

let bad = 0;
for (const dir of ["src", "reels", "manual", "scripts", ".github/workflows"]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(mjs|js|yml|yaml|json)$/.test(f)) continue;
    const p = path.join(dir, f);
    const lines = fs.readFileSync(p, "utf8").split("\n");
    lines.forEach((l, i) => {
      for (const ch of l) {
        const c = ch.codePointAt(0);
        if (c < 32 && c !== 9 && c !== 13) { console.log(`${p}:${i + 1}: kontrol karakteri 0x${c.toString(16).padStart(2, "0")}`); bad++; break; }
      }
    });
  }
}
if (bad) { console.log(`${bad} satırda gizli kontrol karakteri var`); process.exit(1); }
console.log("kontrol karakteri yok");
