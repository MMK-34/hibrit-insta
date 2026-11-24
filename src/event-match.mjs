// Etkinlik tekrar eşleştirmesi (saf yardımcılar; run.mjs ve smoke-test.mjs ortak kullanır).
// Amaç: "Kar Spor İda Ultra Maraton" ↔ "Kaz Dağları'nda 10. İda Ultra Maraton" gibi sponsor ön ekli
// etkinlikleri yazımdan ÖNCE yakalamak; "İstanbul Maratonu" ↔ "İstanbul Yarı Maratonu" ya da
// "Antalya Ultra" ↔ "Alanya Ultra Trail" gibi farklı yarışları yanlış eşleştirmemek (G14).
import { norm } from "./followups.mjs";

export const evKey = (s) => norm(String(s ?? "").replace(/\b(19|20)\d\d\b/g, "").replace(/^\s*\d+\s*\.?\s*/, ""));

// Etkinlik adlarında sponsor ön eki/ek farkı ("Kar Spor İda Ultra Maraton" / "10. İda Ultra Maratonu", G10):
// en uzun ortak parça kısa adın %80'i ve en az 8 harfse aynı etkinlik sayılır
export function lcsOk(a, b) {
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length < 8) return false;
  let best = 0;
  for (let i = 0; i < s.length; i++) for (let j = i + best + 1; j <= s.length; j++) { if (l.includes(s.slice(i, j))) best = j - i; else break; }
  return best >= Math.max(8, Math.ceil(s.length * 0.8));
}

// ASCII katlamalı Türkçe kelime ayrıştırma (Uludağ ↔ Uludag, İda ↔ Ida, Maratonu/Maraton'da → maraton)
const asciiTr = (s = "") => String(s ?? "")
  .toLocaleLowerCase("tr")
  .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const stemType = (w) => {
  if (/^maraton/.test(w)) return "maraton";
  if (/^marathon/.test(w)) return "maraton";
  if (/^kosu/.test(w)) return "kosu";
  if (/^yaris/.test(w)) return "yaris";
  if (/^triatlon|^triathlon/.test(w)) return "triatlon";
  if (/^duatlon|^duathlon/.test(w)) return "duatlon";
  return w;
};

const tokens = (s = "") => asciiTr(s)
  .replace(/['’][a-z]+/g, "") // kesme işaretli Türkçe çekim eki ("Maraton'da" → "maraton")
  .replace(/\b(19|20)\d\d\b/g, " ")
  .split(/[^a-z0-9]+/)
  .filter((w) => w && !/^\d+$/.test(w))
  .map(stemType);

const TYPE_WORDS = new Set(["maraton", "ultra", "trail", "yari", "half", "kosu", "throwdown", "granfondo", "triatlon", "duatlon", "ironman"]);
const GENERIC_WORDS = new Set(["spor", "turkiye", "turkey", "uluslararasi", "international", "buyuk", "kupa", "cup", "yaris", "etkinlik", "festival", "sehir", "city", "halk", "belediye", "resmi", "yeni", "ozel", "run", "race", "series", "games", "open"]);

const hasHalfMarathon = (toks) => hasContiguousSeq(toks, ["yari", "maraton"]) || hasContiguousSeq(toks, ["half", "maraton"]) || toks.some((w) => w.startsWith("yarimaraton") || w.startsWith("halfmarathon"));
const hasUltra = (toks) => toks.some((w) => w === "ultra" || w.startsWith("ultramarat") || w.startsWith("ultratrail"));
const subTypesCompatible = (aToks, bToks) => hasHalfMarathon(aToks) === hasHalfMarathon(bToks) && hasUltra(aToks) === hasUltra(bToks);

function hasContiguousSeq(hay, needle) {
  if (!needle.length || needle.length > hay.length) return false;
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/**
 * Sponsor ön eki atılarak kalan çekirdek ile aday başlık/etkinlik eşleşmesi:
 * - İlk 0..3 sponsor kelimesi atılır (en az 2 kelime kalmalı)
 * - Kalan çekirdek: en az 1 ayırt edici (tür/genel dışı, >=3 harf) kelime + en az 1 tür kelimesi + >=8 harf
 * - Tür uyumu: "yarı"/"half" ve "ultra" her iki tarafta aynı olmalı
 * - Kelime sınırında bitişik dizi eşleşmesi ("ida" ≠ "gıda")
 */
function sponsorCoreMatches(postedEventName, targetText) {
  const pToks = tokens(postedEventName);
  const tToks = tokens(targetText);
  if (pToks.length < 2 || tToks.length < 2) return false;
  if (!subTypesCompatible(pToks, tToks)) return false;
  const maxDrop = Math.min(3, pToks.length - 2);
  for (let drop = 0; drop <= maxDrop; drop++) {
    const core = pToks.slice(drop);
    const hasType = core.some((w) => TYPE_WORDS.has(w));
    const hasDistinct = core.some((w) => w.length >= 3 && !TYPE_WORDS.has(w) && !GENERIC_WORDS.has(w));
    if (!hasType || !hasDistinct || core.join("").length < 8) continue;
    if (hasContiguousSeq(tToks, core)) return true;
  }
  return false;
}

/** Kayıtlı bir postun etkinlik adı (`postedEventName`) yeni aday (`eventName`, `text`) ile aynı etkinlik mi? */
export function sameEventMatch(postedEventName, { eventName = "", text = "" } = {}) {
  const pk = evKey(postedEventName);
  if (pk.length < 6) return false;
  const pToks = tokens(postedEventName);
  const k = evKey(eventName);
  const t = norm(text);
  const target = `${eventName} ${text}`.trim();
  // Farklı alt türler ("İstanbul Maratonu" ≠ "İstanbul Yarı Maratonu", "Antalya Maratonu" ≠ "Antalya Ultra") eşleşmez.
  // Alt tür yalnızca etkinlik ADLARI arasında karşılaştırılır: haber metninde "maraton ve yarı maraton parkurları" geçmesi
  // aynı yarışın tekrarını gizlememeli (Claude incelemesi; eski kod bu durumu yakalıyordu)
  if (k && !subTypesCompatible(pToks, tokens(eventName))) return false;
  if (k.length >= 6 && (k.includes(pk) || pk.includes(k) || lcsOk(k, pk))) return true;
  if (t && t.includes(pk)) return true;
  if (target && sponsorCoreMatches(postedEventName, target)) return true;
  return false;
}
