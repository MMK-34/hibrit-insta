// Örnek içerikle şablon testi: out/test/<post>/NN.jpg
import { renderPost } from "./render.mjs";
import { findImages } from "./images.mjs";

const sample = [
  {
    id: "carousel", category: "hyrox", source: "Rox Lyfe", dateLabel: "8 KASIM 2026",
    slides: [
      { type: "cover", kicker: "Hafta sonu özeti", title: "HYROX sezonunda ilk büyük sürpriz", subtitle: "Elite 15'te favoriler zorlandı. 3 maddede neler oldu?" },
      { type: "stat", label: "Kazanan süre", value: "53:22", body: "Erkekler Elite kategorisinde sezonun en hızlı derecesi." },
      { type: "text", title: "Fark nerede açıldı?", bullets: ["Sled push istasyonunda ilk üç arasında 40 saniye fark oluştu.", "Wall ball serisini kırmadan bitiren tek sporcu kazanan oldu.", "Koşu bölümlerinde ortalama tempo 3:20/km altında kaldı."] },
      { type: "end", title: "Sence kim durdurur?", body: "Yorumlara tahminini yaz, sezon sonunda bakalım." },
    ],
  },
  {
    id: "single", category: "crossfit", source: "Morning Chalk Up", dateLabel: "8 KASIM 2026",
    slides: [{ type: "cover", kicker: "Son dakika · Open 2027", title: "CrossFit Open 2027 tarihleri açıklandı: şubat sonunda başlıyor", subtitle: "Üç haftalık format korunuyor, kayıtlar aralıkta açılacak." }],
  },
];

const Q = { carousel: ["hyrox race", "sled push gym"], single: ["crossfit competition", "crossfit barbell"] };
for (const p of sample) {
  p.photos = await findImages(Q[p.id], Math.min(p.slides.length, 3), p.category);
  const files = await renderPost(p, `out/test/${p.id}`);
  console.log(p.id, files.length, "slayt");
}
