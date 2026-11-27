// Etkinlik takip serisi: bir yarış duyurusu paylaşıldıktan sonra aynı etkinlik için ek içerikler planlanır.
//   +4 gün: geçmiş edisyonlarda neler oldu (kazananlar, kategoriler, katılım)
//   +9 gün: geçmiş yıllarda yarışmada çıkan antrenmanlar (workout'lar)
// Haber çıkmayan çalışmalarda vadesi gelen takip postu paylaşılır. Kaynak: portal yarışma arşivi + resmî siteler (web araması).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FILE = "state/followups.json";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVE = path.join(ROOT, "cal", "src", "data", "events");

export const FOLLOWUP_TYPES = {
  gecmis: {
    afterDays: 4,
    title: (n) => `${n}: geçmiş edisyonlarda neler oldu?`,
    brief: (n) => `${n} etkinliğinin geçmiş edisyonları: yapıldığı yer ve tarihler, kategoriler ve kontenjanlar, format (gün ve workout sayısı), katılım; doğrulanabiliyorsa kazananlar ve dereceler. Bilgileri resmî sonuç sayfalarından, kayıt platformundan ve organizatörün sitesinden doğrula. Kazanan ya da derece doğrulanamazsa o kısmı yazma ama postu doğrulanabilen bilgilerle (tarih, yer, kategori, format) yine hazırla. Yalnızca hiçbir bilgi doğrulanamıyorsa factsOk=false ver.`,
  },
  wodlar: {
    afterDays: 9,
    title: (n) => `${n}: geçmiş yıllarda çıkan antrenmanlar`,
    brief: (n) => `${n} yarışmasında geçmiş yıllarda yayımlanan workout'lar (antrenmanlar): hareketler, tekrar/süre/ağırlık. Yalnızca organizatörün resmî duyurularında ya da resmî skor platformunda geçen workout'ları yaz. Hiç doğrulanabilir workout yoksa factsOk=false ver.`,
  },
};

const DRY = process.argv.includes("--dry");

/** Dosya yoksa boş liste; dosya bozuksa HATA (üzerine yazılmasın diye). */
export function loadFollowups() {
  if (!fs.existsSync(FILE)) return [];
  let list;
  try { list = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { throw new Error(`${FILE} bozuk (JSON okunamadı), dokunulmadı: ${e.message}`); }
  if (!Array.isArray(list)) throw new Error(`${FILE} beklenmeyen biçimde (dizi değil), dokunulmadı`);
  return list;
}
export function saveFollowups(list) {
  if (DRY) return; // dry çalışmada durum yazılmaz
  fs.mkdirSync("state", { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(list.slice(-200), null, 2) + "\n");
  fs.renameSync(`${FILE}.tmp`, FILE);
}

export const norm = (s = "") => String(s).toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/[^a-z0-9ğüşöç]/g, "");

// Kısa Reels tekrar kontrolü (kullanıcı 2026-11-28): yarışa özgü kelimeler (4+ harf; sayı ve dolgu kelimeleri hariç) öteki kaydın
// norm anahtarında geçiyor mu. En az 2 kelime (tek kelimelik adda 1) eşleşirse aynı yarış: "Wolf Haven Yarışması" ~ "wolfhaven2event".
// Şehir/ülke/genel tür kelimeleri de dolgu sayılır: "HYROX İstanbul" ile "ATHX İstanbul" aynı yarış değildir (Antigravity incelemesi).
const RACE_FILL = /^(yarisma\w*|yaris\w*|event\w*|etkinli\w*|duyuru\w*|kayit\w*|geliyor|basliyor|acildi|aciliyor|yeni|ikinci|birinci|edition|games|series|throwdown|challenge|championship\w*|sampiyona\w*|crossfit|hyrox|athx|fitness|open|team|festival|kupasi|cup|istanbul|ankara|izmir|antalya|bursa|bodrum|kusadasi|kapadokya|cappadocia|turkiye|turkey|athens|tirana|sofia|varna|belgrade|ultra|trail|maraton\w*|marathon|kosu\w*|half|world|international|uluslararasi|triathlon|triatlon)$/;
const ascii = (s) => String(s ?? "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u");
export function shortRaceSame(name, otherEv) {
  const ws = [...new Set(ascii(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !/\d/.test(w) && !RACE_FILL.test(w)))];
  if (!ws.length || !otherEv) return false;
  const ev = ascii(otherEv);
  const hit = ws.filter((w) => ev.includes(w)).length;
  return hit >= Math.min(2, ws.length);
}

/** Duyuru paylaşıldığında takip postlarını planlar (aynı etkinlik 120 gün içinde ikinci kez planlanmaz). */
export function scheduleFollowups({ eventName, officialSite, category }, today) {
  // Resmî sitesi olmayan küçük yarışa takip açılmaz: arşiv bulunamayıp taslak boşa gidiyordu (G10: Mayhem Madness, Wolf Haven)
  if (!eventName || !officialSite) return 0;
  const list = loadFollowups();
  const key = norm(eventName);
  const recent = list.some((f) => f.key === key && (Date.parse(today) - Date.parse(f.createdDay)) / 864e5 < 120);
  if (recent) return 0;
  let n = 0;
  for (const [type, t] of Object.entries(FOLLOWUP_TYPES)) {
    const due = new Date(Date.parse(today) + t.afterDays * 864e5).toISOString().slice(0, 10);
    list.push({ key, type, eventName, officialSite: officialSite ?? "", category: category ?? "genel", createdDay: today, due, status: "bekliyor" });
    n++;
  }
  saveFollowups(list);
  return n;
}

/** Vadesi gelmiş ilk takip (en fazla 10 gün gecikmeli; daha eskisi iptal sayılır). */
export function dueFollowup(today) {
  const list = loadFollowups();
  return list.find((f) => f.status === "bekliyor" && f.due <= today && (Date.parse(today) - Date.parse(f.due)) / 864e5 <= 10) ?? null;
}

export function markFollowup(fu, status) {
  const list = loadFollowups();
  const x = list.find((f) => f.key === fu.key && f.type === fu.type && f.createdDay === fu.createdDay);
  if (x) { x.status = status; x.doneAt = new Date().toISOString(); }
  saveFollowups(list);
}

/** Portal arşivinde etkinliğe ait kayıt (varsa) — yazar için başlangıç kaynağı. */
export function archiveText(eventName) {
  if (!fs.existsSync(ARCHIVE)) return "";
  const key = norm(eventName);
  for (const f of fs.readdirSync(ARCHIVE)) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(ARCHIVE, f), "utf8"));
      const k = norm(j.name);
      // Tam eşleşme ya da (kısa genel adlar yanlış kayda bağlanmasın diye) iki ad da en az 8 karakterken içerme
      if (k && (k === key || (Math.min(k.length, key.length) >= 8 && (key.includes(k) || k.includes(key))))) {
        const { name, city, country, website, editions, analysis, description } = j;
        return { website: website ?? "", text: JSON.stringify({ name, city, country, website, description, editions, analysis }).slice(0, 7000) };
      }
    } catch { /* bozuk kayıt: geç */ }
  }
  return "";
}

/** Takip için yazara verilecek pick + kaynak listesi */
export function followupInput(fu) {
  const t = FOLLOWUP_TYPES[fu.type];
  const arch = archiveText(fu.eventName);
  const url = fu.officialSite || arch.website || "";
  return {
    pick: { kind: "bilgi", format: "carousel", category: fu.category, score: 6 },
    sources: [{
      id: `fu:${fu.key}:${fu.type}`, source: "Hibrit Portal arşivi", title: t.title(fu.eventName), url,
      snippet: `${t.brief(fu.eventName)} Bu bir TAKİP postudur (etkinlik daha önce duyuruldu); tazelik kuralı uygulanmaz. Resmî site: ${url || "bilinmiyor"}. `
        + (arch.text ? `Portal arşiv kaydı (başlangıç noktası; web'de doğrula): ${arch.text}` : "Portal arşivinde kayıt yok; web_search ile resmî kaynakları bul."),
      text: "",
    }],
  };
}
