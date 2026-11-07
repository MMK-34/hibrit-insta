// Yayın öncesi otomatik kontrol (insan onayı yerine). Tam otomatik modda modelin ürettiği metin
// kaynaktaki olası talimat enjeksiyonuna karşı burada süzülür. Sorun varsa post paylaşılmaz.
import { BRAND } from "./config.mjs";

// Her TLD'yi yakalar (boşluksuz "ad.uzanti", "ad[.]uzanti", "ad。uzanti"); metin önce NFKC ile normalize edilir.
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[\p{L}\p{N}-]+(?:\.|\[\.\]|。)[\p{L}]{2,}\b\S*/giu;
const MENTION_RE = /(^|\s)@[\w.]{2,30}/g;
const BAD = /(casino|bahis|bet\b|kripto|crypto|airdrop|dm\s*at|link\s*bio|bio'?daki\s*link|whatsapp|telegram|onlyfans|indirim\s*kodu|promo\s*code)/i;
const TOPIC = /(hyrox|crossfit|maraton|marathon|koşu|kosu|run|wod|antrenman|fitness|yarış|yaris|sporcu|atlet|kuvvet|dayanıklılık|ultra|throwdown|games|open|elite|sled|wall ball|burpee|rowing|kürek|halter|barbell|kettlebell|araştırma|çalışma)/i;

const FIELDS = ["kicker", "title", "subtitle", "body", "label", "value"];
const clean = (t = "") => String(t).normalize("NFKC").replace(URL_RE, "").replace(MENTION_RE, "$1").replace(/[ \t]{2,}/g, " ").trim();

/** Post'u temizler ve doğrular. { ok, reason, post } döner. */
export function guardPost(post, { sourceName }) {
  const slides = (post.slides ?? []).map((s) => {
    // Yalnızca bilinen alanlarla yeniden kur
    const o = { type: ["cover", "text", "stat", "end"].includes(s.type) ? s.type : "text" };
    for (const k of FIELDS) if (s[k]) o[k] = s[k];
    if (Array.isArray(s.bullets)) o.bullets = s.bullets;
    for (const k of FIELDS) if (o[k]) o[k] = clean(o[k]).slice(0, k === "body" ? 240 : k === "title" ? 100 : 120);
    if (o.bullets) o.bullets = o.bullets.map((b) => clean(b).slice(0, 125)).filter(Boolean).slice(0, 4);
    return o;
  })
    // JSON kalıntısı (',' ":" {" gibi) içeren slayt bozuktur
    .filter((s) => ![...FIELDS.map((k) => s[k]), ...(s.bullets ?? [])].some((t) => t && /','|":"|\{"|"\}|'\s*:\s*'/.test(t)))
    // stat slaytı: kısa, temiz bir değer şart (örn. 53:22, 500, %12, 2,5 km)
    .filter((s) => s.type !== "stat" || (s.value && s.value.length <= 10 && !/['"{}\[\]]/.test(s.value) && s.label))
    // ":" ile bitip içeriği gelmeyen slayt (örn. "Takvim ve kayıt için:") atılır
    .filter((s) => !(s.title && /[:：]\s*$/.test(s.title) && !s.body && !(s.bullets ?? []).length))
    .filter((s) => s.title || s.value || s.body);
  // Karoselin kapağı ilk slayt olmalı
  if (slides.length && slides[0].type !== "cover") return { ok: false, reason: "kapak slaytı yok" };
  if (!slides.length) return { ok: false, reason: "slayt yok" };

  let caption = clean(post.caption ?? "").replace(/\n?\s*kaynak\s*:.*$/gim, "").trim().slice(0, 1900);
  const tags = (post.hashtags ?? []).map((h) => "#" + String(h).replace(/^#/, "").replace(/[^\p{L}\p{N}_]/gu, "")).filter((h) => h.length > 2).slice(0, 12);
  // Kaynak her açıklamanın sonunda (kullanıcı kuralı)
  // Kaynak adı da süzülür: yalnızca harf, rakam, boşluk ve . ' & , - karakterleri; en fazla 60 karakter
  const src = String(sourceName ?? "").normalize("NFKC").replace(/[^\p{L}\p{N} .'&,-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60) || "Hibrit Portal derlemesi";
  caption = `${caption}\n\nKaynak: ${src}\n\n${tags.join(" ")}`;

  const all = [caption, ...slides.flatMap((s) => [...FIELDS.map((k) => s[k]), ...(s.bullets ?? [])])].filter(Boolean).join(" ");
  if (BAD.test(all)) return { ok: false, reason: "yasaklı ifade (spam/reklam şüphesi)" };
  if (!TOPIC.test(all)) return { ok: false, reason: "konu dışı görünüyor" };
  if (/(skandal|şok|olay yarattı|tepki çekti|rezalet|utanç|hezimet|fiyasko)/i.test(all)) return { ok: false, reason: "tarafsızlık: yargılayıcı ifade" };
  if (/ignore (all|previous)|önceki talimat|system prompt/i.test(all)) return { ok: false, reason: "talimat enjeksiyonu şüphesi" };
  const eventName = clean(post.eventName ?? "").slice(0, 80);
  const officialSite = /^https:\/\/[^\s"'<>]+$/i.test(post.officialSite ?? "") ? post.officialSite : "";
  const officialInstagram = /^[\w.]{2,30}$/.test(String(post.officialInstagram ?? "").replace(/^@/, "")) ? String(post.officialInstagram).replace(/^@/, "") : "";
  return { ok: true, post: { slides, caption, eventName, officialSite, officialInstagram, imageQueries: (post.imageQueries ?? []).map((q) => clean(q).slice(0, 60)).slice(0, 4), brand: BRAND.handle } };
}
