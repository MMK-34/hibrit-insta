// Instagram kullanıcı adlarını Business Discovery ile denetler: var mı, okunabiliyor mu (işletme hesabı), biyografi ve son paylaşım.
// Kullanım: node scripts/ig-check.mjs hesap1 hesap2 ...
import "dotenv/config";
const t = process.env.IG_DISCOVERY_TOKEN, id = process.env.IG_USER_ID;
const hs = process.argv.slice(2).join(" ").split(/[\s,]+/).map((h) => h.replace(/^@/, "")).filter(Boolean);
for (const h of [...new Set(hs)]) {
  const f = `business_discovery.username(${h}){username,name,followers_count,biography,media.limit(1){timestamp}}`;
  const j = await fetch(`https://graph.facebook.com/v23.0/${id}?fields=${encodeURIComponent(f)}&access_token=${t}`).then((r) => r.json()).catch(() => null);
  const b = j?.business_discovery;
  console.log(b ? `OK  @${h} | ${b.name} | ${b.followers_count} takipçi | son ${b.media?.data?.[0]?.timestamp?.slice(0, 10) ?? "-"} | ${String(b.biography ?? "").replace(/\s+/g, " ").slice(0, 90)}` : `--  @${h}`);
}
