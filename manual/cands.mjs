import "dotenv/config";

const { collect, upcomingEvents, courseCandidates } = await import("../src/collect.mjs");
const { circle21Candidates } = await import("../src/circle21.mjs");
const { items } = await collect();
const all = [...items, ...(await upcomingEvents().catch(() => [])), ...(await courseCandidates().catch(() => [])), ...(await circle21Candidates().catch(() => []))];
for (const i of all.slice(0, 80)) console.log(`${String(i.ageH ?? "").padStart(3)}h | ${i.feedCat ?? ""} | ${i.source} | ${String(i.title).slice(0, 110)} | ${i.id.slice(0, 50)}`);
console.log("toplam", all.length);
// Bugün paylaşılan / sıradaki postlar (tekrar etmemek için)
const fs = await import("node:fs");
const st = JSON.parse(fs.readFileSync("state/posted.json", "utf8"));
const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
console.log("\nBUGÜN PAYLAŞILAN:", st.posts.filter((p) => p.day === day && p.media && !p.deleted).length, "| BOT DURAKLATILDI:", !!st.paused);
console.log("SON 40 POST BAŞLIĞI:\n" + st.posts.filter((p) => p.media && !p.deleted).slice(-40).map((p) => `- ${p.headline ?? p.title}`).join("\n"));
const q = JSON.parse(fs.readFileSync("state/manual-queue.json", "utf8"));
console.log("HAZIR POST SIRASI:\n" + q.map((x) => `- ${x.publishAt} ${x.title}`).join("\n"));
