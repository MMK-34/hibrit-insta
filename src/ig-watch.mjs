// Organizatör Instagram hesaplarını izleme: yalnızca Instagram'da duyurulan yarışları (ör. @wonderwomanscup) kaçırmamak için.
// Instagram Graph API "Business Discovery" ile herkese açık işletme/içerik üreticisi hesaplarının son paylaşımları okunur.
// Gereken izin: Instagram hesabının bağlı olduğu bir Facebook sayfası + token'da pages_show_list / pages_read_engagement.
// İzin yoksa (hata #10) sessizce boş döner; bot diğer kaynaklarla çalışmaya devam eder.
// İzlenen hesaplar: aşağıdaki sabit liste + circle21'deki Türkiye yarışlarının organizatör hesapları + IG_WATCH ortam değişkeni.

// Türkiye'deki yarış organizatörleri / yarış hesapları (yalnızca var olduğu doğrulanmış kullanıcı adları)
export const IG_WATCH = ["wonderwomanscup", "alsancakteam_series", "olympos.games", "vu.box"];

const HANDLE = /^[A-Za-z0-9_.]{2,30}$/;
let warned = false;

async function discover(handle) {
  // Business Discovery: Facebook sayfası token'ı (IG_DISCOVERY_TOKEN, süresiz) gerekir; yayın token'ı bu izne sahip değil
  const t = process.env.IG_DISCOVERY_TOKEN || process.env.IG_ACCESS_TOKEN, id = process.env.IG_USER_ID;
  if (!t || !id) return { ok: false, perm: false, media: [] };
  const host = t.startsWith("IGAA") ? "graph.instagram.com" : "graph.facebook.com";
  const f = `business_discovery.username(${handle}){username,media.limit(8){id,caption,timestamp,permalink,media_type,media_url,children{media_url,media_type}}}`;
  try {
    const r = await fetch(`https://${host}/v23.0/${id}?fields=${encodeURIComponent(f)}&access_token=${t}`, { signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    if (j?.error) return { ok: false, perm: j.error.code === 10 || j.error.code === 200, media: [] };
    return { ok: true, media: j?.business_discovery?.media?.data ?? [] };
  } catch { return { ok: false, perm: false, media: [] }; }
}

/** Son 3 günün paylaşımları haber adayı olur. extra: ek kullanıcı adları (ör. circle21 organizatörleri). */
export async function igWatchCandidates(extra = []) {
  const env = String(process.env.IG_WATCH ?? "").split(/[\s,]+/);
  const handles = [...new Set([...IG_WATCH, ...extra, ...env].map((h) => String(h ?? "").replace(/^@/, "").trim()).filter((h) => HANDLE.test(h)))].slice(0, 40);
  const cutoff = Date.now() - 3 * 864e5;
  const out = [];
  const curatedSet = new Set([...IG_WATCH, ...env].map((h) => String(h).replace(/^@/, "").trim()));
  for (const h of handles) {
    // Elle seçilmiş liste (IG_WATCH / ortam değişkeni) güvenilir organizatör hesabıdır; circle21 kaydından gelen hesaplar doğrulanmamış sayılır
    const curated = curatedSet.has(h);
    const res = await discover(h);
    if (!res.ok) {
      if (res.perm) {
        if (!warned) console.warn("Instagram izleme: Business Discovery izni yok (Facebook sayfası bağlantısı gerekli); atlandı.");
        warned = true;
        return out;
      }
      continue;
    }
    for (const m of res.media) {
      const ts = Date.parse(m.timestamp ?? 0);
      const cap = String(m.caption ?? "").trim();
      if (ts < cutoff || cap.length < 40) continue;
      const images = [m.media_type === "IMAGE" ? m.media_url : null, ...(m.children?.data ?? []).filter((c) => c.media_type === "IMAGE").map((c) => c.media_url)].filter(Boolean).slice(0, 6);
      out.push({
        id: `ig:${m.id}`, handle: h, curated, url: m.permalink, images,
        title: `@${h} Instagram paylaşımı: ${cap.split("\n")[0].slice(0, 140)}`,
        source: curated ? `@${h} (izlenen organizatör hesabı)` : `@${h} (circle21 kaydından bulunan hesap, doğrulanmamış)`, feedCat: "genel",
        date: new Date(ts).toISOString(), ageH: Math.round((Date.now() - ts) / 36e5),
        snippet: cap.slice(0, 600), text: cap.slice(0, 3000),
      });
    }
  }
  return out;
}
