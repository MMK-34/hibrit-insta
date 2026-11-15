// Hesap sahibinin (@1mehmetkuyucu) son 24 saatte DM ile attığı ihbarlar. Link varsa Instagram gönderisinin
// başlık/açıklama metni (og meta) da yazdırılır. "Paylaş" ile atılan gönderiler API'de okunamaz (UNSUPPORTED).
import "dotenv/config";
const t = process.env.IG_DISCOVERY_TOKEN;
const f = "messages.limit(10){id,message,from,created_time,is_unsupported}";
const j = await fetch(`https://graph.facebook.com/v23.0/${process.env.FB_PAGE_ID || "1341037402435449"}/conversations?platform=instagram&fields=${encodeURIComponent(f)}&limit=5&access_token=${t}`, { signal: AbortSignal.timeout(20000) }).then((r) => r.json());
if (j.error) { console.log("DM okunamadı:", j.error.message); process.exit(0); }
for (const c of j.data ?? []) for (const m of c.messages?.data ?? []) {
  if (m.from?.username !== "1mehmetkuyucu" || Date.parse(m.created_time) < Date.now() - 864e5) continue;
  console.log("---", m.created_time, m.is_unsupported ? "(paylaşım, okunamaz)" : "", "\n", m.message ?? "");
  for (const u of String(m.message ?? "").match(/https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+/g) ?? []) {
    const h = await fetch(u + "/", { headers: { "user-agent": "facebookexternalhit/1.1" }, signal: AbortSignal.timeout(20000) }).then((r) => r.text()).catch(() => "");
    const d = (h.match(/<meta property="og:title" content="([^"]*)"/) ?? [])[1] ?? "";
    console.log("  LINK", u, "\n ", d.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCodePoint(parseInt(x, 16))).slice(0, 1500));
  }
}
