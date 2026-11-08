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
const BAD = /(casino|bahis|(?<![\p{L}])(?:\d*x?bet|bets?10|betboo|tipobet|superbet|jojobet|mobilbet|betist|bet)(?![\p{L}])|kripto|crypto|airdrop|dm\s*at|link\s*bio|bio'?daki\s*link|whatsapp|telegram|onlyfans|indirim\s*kodu|promo\s*code)/iu;
const TOPIC = /(hyrox|crossfit|maraton|marathon|koşu|kosu|\brun\b|wod|antrenman|fitness|yarış|yaris|sporcu|atlet|kuvvet|dayanıklılık|\bultra\b|throwdown|\bgames\b|\bopen\b|elite|sled|wall ball|burpee|rowing|kürek|halter|barbell|kettlebell|araştırma|çalışma|yüz(me|ücü)|güreş|boks|judo|tekvando|karate|eskrim|bisiklet|pedal|tırmanış|dağcı|okçu|cimnastik|jimnastik|atıcı|kano|kayak|yelken|triatlon|duatlon|aquatlon|madalya|şampiyon|rekor|derece|kupa|federasyon|powerlifting|strongman|kalistenik|spartan|parkur)/i;

const FIELDS = ["kicker", "title", "subtitle", "body", "label", "value"];
const clean = (t = "") => String(t).normalize("NFKC").replace(/[’‘]/g, "'").replace(/\s*—\s*/g, ", ").replace(/–/g, "-").replace(URL_RE, "").replace(MENTION_RE, "$1").replace(/[ \t]{2,}/g, " ").trim();

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
    // Alanlar KESİLMEZ (yarım cümle yayınlanmasın): sınırı aşan alan aşağıda gerekçeli retle yazara geri döner
    for (const k of FIELDS) if (o[k]) o[k] = clean(o[k]);
    if (o.bullets) o.bullets = o.bullets.map((b) => clean(b)).filter(Boolean).slice(0, 4);
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
  const LIMIT = { title: 100, body: 240, subtitle: 160, kicker: 40, label: 60, value: 10 };
  const tooLong = [];
  slides.forEach((s, i) => {
    for (const [k, n] of Object.entries(LIMIT)) if (s[k] && s[k].length > n) tooLong.push(`slayt ${i + 1} ${k} ${s[k].length}>${n}`);
    (s.bullets ?? []).forEach((b, j) => { if (b.length > 125) tooLong.push(`slayt ${i + 1} madde ${j + 1} ${b.length}>125`); });
  });
  if (tooLong.length) return { ok: false, reason: `metin çok uzun, kısalt (yarım cümle olmasın): ${tooLong.join("; ")}` };

  let caption = clean(post.caption ?? "").replace(/^\s*kaynak\s*:.*$/gim, "").trim().slice(0, 1900);
  // Hashtag: her biri en fazla 30 karakter (# hariç; uzunsa atılır), tekrarsız, en fazla 12
  const tags = [...new Set((post.hashtags ?? []).map((h) => "#" + String(h).normalize("NFKC").replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "")))]
    .filter((h) => h.length > 2 && h.length - 1 <= MAX_TAG_LEN).slice(0, MAX_TAGS);
  // Marka etiketi her postta (kural): yoksa eklenir, yer yoksa son etiketin yerine
  if (!tags.some((h) => h.toLowerCase() === "#hibritportal")) { if (tags.length >= MAX_TAGS) tags.pop(); tags.push("#hibritportal"); }
  // Kaynak her açıklamanın sonunda (kullanıcı kuralı)
  // Kaynak adı da süzülür: yalnızca harf, rakam, boşluk ve . ' & , - karakterleri; en fazla 60 karakter
  const src = String(sourceName ?? "").normalize("NFKC").replace(URL_RE, "").replace(/[^\p{L}\p{N} .'&,-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60) || "Hibrit Portal derlemesi";
  // Son açıklama en fazla 2200 karakter: gerekirse gövde kısaltılır; "Kaynak:" satırı ve etiketler korunur
  const tail = `\n\nKaynak: ${src}${tags.length ? `\n\n${tags.join(" ")}` : ""}`;
  const room = MAX_CAPTION - tail.length;
  if (caption.length > room) caption = caption.slice(0, Math.max(0, room - 1)).replace(/\s+\S*$/, "").trimEnd() + "…";
  caption = `${caption}${tail}`;

  // Tablo sütun/satır/notları da denetlenir (seri satırları web sayfalarından türeyen model çıktısıdır)
  const all = [caption, ...slides.flatMap((s) => [...FIELDS.map((k) => s[k]), ...(s.bullets ?? []), ...(s.columns ?? []), ...(s.rows ?? []).flat(), s.note])].filter(Boolean).join(" ");
  if (BAD.test(all)) return { ok: false, reason: "yasaklı ifade (spam/reklam şüphesi)" };
  if (!TOPIC.test(all)) return { ok: false, reason: "konu dışı görünüyor" };
  const judge = all.match(/(skandal|şok|olay yarattı|tepki çekti|rezalet|utanç|hezimet|fiyasko|tartışma yarattı|rezil|facia|felaket|yerden yere|destan yazdı|damga vurdu|ezip geçti|silip süpürdü|ders verdi|yerle bir|efsanevi|muhteşem|inanılmaz|mükemmel|çılgın|harika)/i);
  if (judge) return { ok: false, reason: `tarafsızlık: yargılayıcı ifade ("${judge[0]}")` };
  // Kişi sözü / alıntı (kural: antrenör, yetkili, uzman alıntısı yok)
  // \b Türkçe harflerde çalışmaz (ş, ğ, İ...): harf-öncesi/sonrası lookaround kullanılır
  const quote = all.match(/(?<!\p{L})(söyledi|dedi|ifade etti|sözlerini|şöyle konuştu|diye konuştu|dile getirdi)(?!\p{L})/iu);
  if (quote) return { ok: false, reason: `alıntı/kişi sözü var ("${quote[0]}"); yalnızca olanı aktar` };
  // Yapay zekâ ve "içerik üretici" kalıpları
  const cliche = all.match(/(^|[\s.!?])(bir not:|not:|unutmayın|peki ya|hadi |keşfedin|derledik|işte karşınızda|sporseverler)/i);
  if (cliche) return { ok: false, reason: `kalıp ifade ("${cliche[2]}"); haber dili kullan` };
  if ((all.match(/!/g) ?? []).length > 1) return { ok: false, reason: "birden fazla ünlem; en fazla 1" };
  if (/ignore (all|previous)|önceki talimat|system prompt/i.test(all)) return { ok: false, reason: "talimat enjeksiyonu şüphesi" };
  const eventName = clean(post.eventName ?? "").slice(0, 80);
  const lk = `${all} ${eventName}`.match(LINKISH_RE);
  if (lk) return { ok: false, reason: `link benzeri ifade: "${lk[0]}" (alan adı/link yazma; nokta sonrası boşluk bırak)` };
  const officialSite = /^https:\/\/[^\s"'<>]+$/i.test(post.officialSite ?? "") ? post.officialSite : "";
  const officialInstagram = /^[\w.]{2,30}$/.test(String(post.officialInstagram ?? "").replace(/^@/, "")) ? String(post.officialInstagram).replace(/^@/, "") : "";
  return { ok: true, post: { slides, caption, eventName, officialSite, officialInstagram, imageQueries: (post.imageQueries ?? []).map((q) => clean(q).slice(0, 60)).slice(0, 4), brand: BRAND.handle } };
}
