// Yayın öncesi otomatik kontrol (insan onayı yerine). Tam otomatik modda modelin ürettiği metin
// kaynaktaki olası talimat enjeksiyonuna karşı burada süzülür. Sorun varsa post paylaşılmaz.
import { BRAND } from "./config.mjs";

// Yalnızca gerçek adresleri yakalar: http(s)://..., www.... ya da beyaz listedeki KÜÇÜK HARFLİ bir TLD ile biten alan adı
// ("ad.com", "ad[.]com", "ad(.)com", "ad。com", "alt.ad.com.tr/yol"). "açıldı.Ücret", "St.Louis", "Aralık'ta.Kayıt" gibi
// boşluksuz cümle geçişlerine dokunmaz. Metin önce NFKC ile normalize edilir.
const TLDS = "com|org|net|io|tr|co|events|app|info|me";
const DOT = String.raw`(?:\.|\[\.\]|\(\.\)|。)`;
const LABEL = String.raw`[\p{L}\p{N}][\p{L}\p{N}\-]*`;
const URL_RE = new RegExp(
  String.raw`(?:[hH][tT][tT][pP][sS]?:\/\/|[wW]{3}\.)\S+`
  + String.raw`|(?<![\p{L}\p{N}\-.])${LABEL}(?:${DOT}${LABEL})*${DOT}(?:${TLDS})(?![\p{L}\p{N}\-])(?:[\/?#]\S*)?`,
  "giu",
);
// Temizlikten sonra kalan link benzeri ifade (harfle başlayan etiket + nokta/[.]/(.)/。 + boşluksuz, TAMAMI küçük harf 2+ harf):
// varsa post REDDEDİLİR (silinmez). "St.Louis", "açıldı.Ücret" gibi büyük harfle devam eden geçişler etkilenmez.
const LINKISH_RE = /(?<![\p{L}\p{N}\-.])[\p{L}][\p{L}\p{N}\-]+(?:\.|\[\.\]|\(\.\)|。)\p{Ll}{2,}(?![\p{L}\p{N}])/u;
const MAX_SLIDES = 10, MAX_TAGS = 12, MAX_TAG_LEN = 30, MAX_CAPTION = 2200;
const MENTION_RE = /(^|\s)@[\w.]{2,30}/g;
const BAD = /(casino|bahis|bet\b|kripto|crypto|airdrop|dm\s*at|link\s*bio|bio'?daki\s*link|whatsapp|telegram|onlyfans|indirim\s*kodu|promo\s*code)/i;
const TOPIC = /(hyrox|crossfit|maraton|marathon|koşu|kosu|run|wod|antrenman|fitness|yarış|yaris|sporcu|atlet|kuvvet|dayanıklılık|ultra|throwdown|games|open|elite|sled|wall ball|burpee|rowing|kürek|halter|barbell|kettlebell|araştırma|çalışma)/i;

const FIELDS = ["kicker", "title", "subtitle", "body", "label", "value"];
const clean = (t = "") => String(t).normalize("NFKC").replace(/\s*[—–]\s*/g, ", ").replace(URL_RE, "").replace(MENTION_RE, "$1").replace(/[ \t]{2,}/g, " ").trim();

/** Post'u temizler ve doğrular. { ok, reason, post } döner. */
export function guardPost(post, { sourceName }) {
  const slides = (post.slides ?? []).map((s) => {
    // Yalnızca bilinen alanlarla yeniden kur
    const o = { type: ["cover", "text", "stat", "end", "table"].includes(s.type) ? s.type : "text" };
    if (o.type === "table") {
      o.columns = (s.columns ?? []).slice(0, 4).map((c) => clean(c).slice(0, 24));
      o.rows = (s.rows ?? []).slice(0, 7).map((r) => (r ?? []).slice(0, o.columns.length).map((c) => clean(c).slice(0, 40)));
      if (s.note) o.note = clean(s.note).slice(0, 140);
      if (Array.isArray(s.highlight)) o.highlight = s.highlight.filter(Number.isInteger).slice(0, 7);
      if (Number.isInteger(s.barCol)) o.barCol = s.barCol;
    }
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
  // Instagram karosel sınırı: en fazla 10 slayt (fazlaysa ilk 9 + son slayt)
  if (slides.length > MAX_SLIDES) slides.splice(MAX_SLIDES - 1, slides.length - MAX_SLIDES);
  // Karoselin kapağı ilk slayt olmalı
  if (slides.length && slides[0].type !== "cover") return { ok: false, reason: "kapak slaytı yok" };
  if (!slides.length) return { ok: false, reason: "slayt yok" };

  let caption = clean(post.caption ?? "").replace(/\n?\s*kaynak\s*:.*$/gim, "").trim().slice(0, 1900);
  // Hashtag: her biri en fazla 30 karakter (# hariç; uzunsa atılır), tekrarsız, en fazla 12
  const tags = [...new Set((post.hashtags ?? []).map((h) => "#" + String(h).normalize("NFKC").replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "")))]
    .filter((h) => h.length > 2 && h.length - 1 <= MAX_TAG_LEN).slice(0, MAX_TAGS);
  // Kaynak her açıklamanın sonunda (kullanıcı kuralı)
  // Kaynak adı da süzülür: yalnızca harf, rakam, boşluk ve . ' & , - karakterleri; en fazla 60 karakter
  const src = String(sourceName ?? "").normalize("NFKC").replace(/[^\p{L}\p{N} .'&,-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60) || "Hibrit Portal derlemesi";
  // Son açıklama en fazla 2200 karakter: gerekirse gövde kısaltılır; "Kaynak:" satırı ve etiketler korunur
  const tail = `\n\nKaynak: ${src}${tags.length ? `\n\n${tags.join(" ")}` : ""}`;
  const room = MAX_CAPTION - tail.length;
  if (caption.length > room) caption = caption.slice(0, Math.max(0, room - 1)).replace(/\s+\S*$/, "").trimEnd() + "…";
  caption = `${caption}${tail}`;

  const all = [caption, ...slides.flatMap((s) => [...FIELDS.map((k) => s[k]), ...(s.bullets ?? [])])].filter(Boolean).join(" ");
  if (BAD.test(all)) return { ok: false, reason: "yasaklı ifade (spam/reklam şüphesi)" };
  if (!TOPIC.test(all)) return { ok: false, reason: "konu dışı görünüyor" };
  if (/(skandal|şok|olay yarattı|tepki çekti|rezalet|utanç|hezimet|fiyasko)/i.test(all)) return { ok: false, reason: "tarafsızlık: yargılayıcı ifade" };
  if (/ignore (all|previous)|önceki talimat|system prompt/i.test(all)) return { ok: false, reason: "talimat enjeksiyonu şüphesi" };
  const eventName = clean(post.eventName ?? "").slice(0, 80);
  if (LINKISH_RE.test(`${all} ${eventName}`)) return { ok: false, reason: "link benzeri ifade" };
  const officialSite = /^https:\/\/[^\s"'<>]+$/i.test(post.officialSite ?? "") ? post.officialSite : "";
  const officialInstagram = /^[\w.]{2,30}$/.test(String(post.officialInstagram ?? "").replace(/^@/, "")) ? String(post.officialInstagram).replace(/^@/, "") : "";
  return { ok: true, post: { slides, caption, eventName, officialSite, officialInstagram, imageQueries: (post.imageQueries ?? []).map((q) => clean(q).slice(0, 60)).slice(0, 4), brand: BRAND.handle } };
}
