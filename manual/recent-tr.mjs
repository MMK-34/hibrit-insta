import "dotenv/config";
// Türkiye hesaplarının son 36 saatteki paylaşımları (az istek: Meta saatlik sınırı paylaşımla ortak)
const t = process.env.IG_DISCOVERY_TOKEN, id = process.env.IG_USER_ID;
const since = Date.now() - 36 * 36e5;
for (const h of ["hyroxturk", "alsancakteam_series", "eurasiathrowdown", "olympos.games", "battleofanatolia", "runtalyamarathon", "cappadociaultratrail", "istanbulcitychampionship", "hybridx_turkiye"]) {
  const f = `business_discovery.username(${h}){media.limit(4){id,caption,timestamp,permalink,media_type}}`;
  const j = await fetch(`https://graph.facebook.com/v23.0/${id}?fields=${encodeURIComponent(f)}&access_token=${t}`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json()).catch(() => ({}));
  if (j.error) { console.log(h, "HATA", j.error.code); if ([4, 17, 32, 613].includes(j.error.code)) break; continue; }
  for (const m of j.business_discovery?.media?.data ?? []) {
    const ts = Date.parse(m.timestamp.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
    if (ts > since) console.log(new Date(ts).toISOString().slice(5, 16), "@" + h, m.media_type, m.permalink, "|", String(m.caption ?? "").replace(/\s+/g, " ").slice(0, 400));
  }
}
