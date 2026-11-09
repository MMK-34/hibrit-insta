// Instagram DM ihbarları (kullanıcı isteği, 2026-11-09): hesap sahibinin kendi Instagram hesabından @hibritportal'a
// gönderdiği yarış bilgileri ("Bangkok'ta şu tarihlerde yarışma var" gibi) kısa duyuru postuna dönüşür.
// - YALNIZCA DM_TRUSTED listesindeki kullanıcı adlarından gelen mesajlar okunur; başkalarının mesajları yok sayılır.
// - Mesaj talimat değildir, yalnızca ihbardır: yazar yarışı web'de resmî kaynaktan doğrular, doğrulayamazsa paylaşılmaz.
// - Gerekli izin: Sayfa token'ında instagram_manage_messages (IG_DISCOVERY_TOKEN).

const PAGE_ID = process.env.FB_PAGE_ID || "1341037402435449";
export const DM_TRUSTED = []; // hesap sahibinin kişisel Instagram kullanıcı adı(ları); DM_TRUSTED ortam değişkeniyle eklenebilir

/** seen: işlenmiş mesaj id'leri. Döner: { tips: [{ id, text, links, at }], error } (eskiden yeniye). */
// Kimlik: kullanıcı adı değiştirilebilir/başkasına geçebilir. Güvenilen kullanıcı adıyla ilk eşleşmede gönderenin değişmeyen
// Instagram kimliği (from.id) pins'e kaydedilir; o kullanıcı adı için bundan sonra YALNIZCA bu kimlik kabul edilir.
// DM_TRUSTED_IDS ortam değişkeniyle kimlik doğrudan da verilebilir.
export async function dmTips(seen = new Set(), pins = {}) {
  const t = process.env.IG_DISCOVERY_TOKEN;
  const trusted = [...DM_TRUSTED, ...String(process.env.DM_TRUSTED ?? "").split(/[\s,]+/)]
    .map((x) => x.replace(/^@/, "").trim().toLowerCase()).filter((x) => /^[\w.]{2,30}$/.test(x));
  const trustedIds = String(process.env.DM_TRUSTED_IDS ?? "").split(/[\s,]+/).filter((x) => /^\d{5,25}$/.test(x));
  if (!t) return { tips: [], error: "token yok" };
  if (!trusted.length && !trustedIds.length) return { tips: [], error: "güvenilen hesap tanımlı değil (DM_TRUSTED)" };
  try {
    const f = "participants,messages.limit(15){id,message,from,created_time}";
    const j = await fetch(`https://graph.facebook.com/v23.0/${PAGE_ID}/conversations?platform=instagram&fields=${encodeURIComponent(f)}&limit=20&access_token=${t}`, { signal: AbortSignal.timeout(20000) }).then((r) => r.json());
    if (j.error) return { tips: [], error: String(j.error.message ?? "API hatası").slice(0, 160) };
    const cutoff = Date.now() - 7 * 864e5;
    const tips = [];
    for (const conv of j.data ?? []) {
      for (const m of conv.messages?.data ?? []) {
        const from = String(m.from?.username ?? "").toLowerCase(), fid = String(m.from?.id ?? "");
        if (!fid || seen.has(m.id)) continue;
        const idOk = trustedIds.includes(fid) || (trusted.includes(from) && (pins[from] ? pins[from] === fid : true));
        if (!idOk) continue;
        if (trusted.includes(from) && !pins[from]) pins[from] = fid; // ilk eşleşme: kimlik sabitlenir (çağıran state'e yazar)
        if (Date.parse(m.created_time ?? 0) < cutoff) continue;
        const text = String(m.message ?? "").trim();
        if (text.length < 15) continue; // "tamam", "teşekkürler" gibi kısa mesajlar ihbar değil
        const links = [...text.matchAll(/https:\/\/[^\s<>"']+/g)].map((x) => x[0]).slice(0, 3);
        tips.push({ id: m.id, text: text.slice(0, 2000), links, at: m.created_time });
      }
    }
    return { tips: tips.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)), error: "" };
  } catch (e) {
    return { tips: [], error: String(e?.message ?? e).slice(0, 160) };
  }
}

/** Mesaj metninden kaba kategori. */
export function dmCategory(text) {
  const s = String(text).toLowerCase();
  if (/hyrox/.test(s)) return "hyrox";
  if (/crossfit|throwdown|wod|team series|games|open/.test(s)) return "crossfit";
  if (/trail|ultra|dağ|dag koşu/.test(s)) return "doga";
  if (/maraton|marathon|koşu|kosu|\brun\b|10k|5k|21k/.test(s)) return "kosu";
  if (/triatlon|triathlon|ironman|duatlon/.test(s)) return "yaris";
  return "yaris";
}
