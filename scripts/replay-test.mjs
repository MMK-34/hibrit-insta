// Offline replay test paketi: src/guard.mjs içindeki tüm yayın öncesi kuralları
// scripts/replay-fixtures.json verisiyle ağ veya API anahtarı olmadan test eder.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guardPost } from "../src/guard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, "replay-fixtures.json");
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));

let passed = 0;
let failed = 0;
const failures = [];

function checkPostOutput(res, checks = {}) {
  const errs = [];
  const p = res.post;
  if (checks.noHatChars) {
    const dump = JSON.stringify(p.slides) + " " + p.caption;
    if (/[âÂîÎûÛ]/.test(dump)) errs.push("çıktıda şapkalı harf kaldı");
  }
  if (checks.titleEquals !== undefined && p.slides?.[0]?.title !== checks.titleEquals) {
    errs.push(`başlık beklenen "${checks.titleEquals}", gelen "${p.slides?.[0]?.title}"`);
  }
  if (checks.hlEquals !== undefined && p.slides?.[0]?.hl !== checks.hlEquals) {
    errs.push(`hl beklenen "${checks.hlEquals}", gelen "${p.slides?.[0]?.hl}"`);
  }
  if (checks.hlUndefined && p.slides?.[0]?.hl !== undefined) {
    errs.push(`hl düşürülmeliydi ama "${p.slides?.[0]?.hl}" kaldı`);
  }
  if (Array.isArray(checks.captionIncludes)) {
    for (const sub of checks.captionIncludes) {
      if (!p.caption.includes(sub)) errs.push(`caption içinde "${sub}" bulunamadı`);
    }
  }
  if (Array.isArray(checks.captionExcludes)) {
    for (const sub of checks.captionExcludes) {
      if (p.caption.includes(sub)) errs.push(`caption içinde yasaklı "${sub}" bulundu`);
    }
  }
  return errs;
}

for (const tc of fixtures.cases) {
  const input = structuredClone(fixtures.basePost);
  Object.assign(input, tc.override ?? {});
  const res = guardPost(input, { sourceName: tc.sourceName ?? fixtures.sourceName });

  const reasons = [];
  if (Boolean(res.ok) !== Boolean(tc.expectOk)) {
    reasons.push(`beklenen ok=${tc.expectOk}, gelen ok=${res.ok}${res.reason ? ` (${res.reason})` : ""}`);
  } else if (!tc.expectOk && tc.expectReason) {
    if (!String(res.reason ?? "").toLocaleLowerCase("tr").includes(tc.expectReason.toLocaleLowerCase("tr"))) {
      reasons.push(`beklenen ret nedeni "${tc.expectReason}", gelen "${res.reason ?? ""}"`);
    }
  } else if (tc.expectOk && tc.checks) {
    reasons.push(...checkPostOutput(res, tc.checks));
  }

  if (reasons.length === 0) {
    passed++;
    console.log(`PASS [${tc.id}] ${tc.description}`);
  } else {
    failed++;
    const msg = `FAIL [${tc.id}] ${tc.description} -> ${reasons.join("; ")}`;
    console.error(msg);
    failures.push(msg);
  }
}

console.log(`\nSonuç: ${passed} geçti, ${failed} kaldı (toplam ${fixtures.cases.length}).`);
if (failed > 0) process.exit(1);
