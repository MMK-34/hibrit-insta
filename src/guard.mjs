// Yayın öncesi otomatik kontrol (insan onayı yerine). Tam otomatik modda modelin ürettiği metin
// kaynaktaki olası talimat enjeksiyonuna karşı burada süzülür. Sorun varsa post paylaşılmaz.
import { BRAND } from "./config.mjs";

const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|tr|ly|me|app|link)\b\S*/gi;
const MENTION_RE = /(^|\s)@[\w.]{2,30}/g;
const BAD = /(casino|bahis|bet\b|kripto|crypto|airdrop|dm\s*at|link\s*bio|bio'?daki\s*link|whatsapp|telegram|onlyfans|indirim\s*kodu|promo\s*code)/i;
const TOPIC = /(hyrox|crossfit|maraton|marathon|koşu|kosu|run|wod|antrenman|fitness|yarış|yaris|sporcu|atlet|kuvvet|dayanıklılık|ultra|throwdown|games|open|elite|sled|wall ball|burpee|rowing|kürek|halter|barbell|kettlebell|araştırma|çalışma)/i;

const clean = (t = "") => String(t).replace(URL_RE, "").replace(MENTION_RE, "$1").replace(/[ \t]{2,}/g, " ").trim();

/** Post'u temizler ve doğrular. { ok, reason, post } döner. */
export function guardPost(post, { sourceName }) {
  const slides = (post.slides ?? []).map((s) => {
    const o = { ...s };
    for (const k of ["kicker", "title", "subtitle", "body", "label", "value"]) if (o[k]) o[k] = clean(o[k]).slice(0, k === "body" ? 260 : 120);
    if (o.bullets) o.bullets = o.bullets.map((b) => clean(b).slice(0, 140)).filter(Boolean).slice(0, 4);
    return o;
  }).filter((s) => s.title || s.value || s.body);
  if (!slides.length) return { ok: false, reason: "slayt yok" };

  let caption = clean(post.caption ?? "").replace(/\n?\s*kaynak\s*:.*$/gim, "").trim().slice(0, 1900);
  const tags = (post.hashtags ?? []).map((h) => "#" + String(h).replace(/^#/, "").replace(/[^\p{L}\p{N}_]/gu, "")).filter((h) => h.length > 2).slice(0, 12);
  // Kaynak her açıklamanın sonunda (kullanıcı kuralı)
  caption = `${caption}\n\nKaynak: ${sourceName}\n\n${tags.join(" ")}`;

  const all = [caption, ...slides.flatMap((s) => [s.kicker, s.title, s.subtitle, s.body, ...(s.bullets ?? [])])].join(" ");
  if (BAD.test(all)) return { ok: false, reason: "yasaklı ifade (spam/reklam şüphesi)" };
  if (!TOPIC.test(all)) return { ok: false, reason: "konu dışı görünüyor" };
  if (/ignore (all|previous)|önceki talimat|system prompt/i.test(all)) return { ok: false, reason: "talimat enjeksiyonu şüphesi" };
  return { ok: true, post: { ...post, slides, caption, brand: BRAND.handle } };
}
