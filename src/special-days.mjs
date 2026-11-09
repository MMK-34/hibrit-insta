// Millî ve özel günler (kullanıcı kuralı, 2026-11-09): bu postlar çok hassastır.
// - Metinler yapay zekâ ile ÜRETİLMEZ: aşağıdaki sabit, elle yazılmış ve kontrol edilmiş metinler kullanılır.
// - Alıntı (söz) kullanılmaz: yanlış atfedilen söz riski var.
// - Her post kullanıcıya ONAYLATILIR; onay gelmeden asla paylaşılmaz. Onay gelirse günün sabahı (publishHour sonrası ilk çalışma) paylaşılır.
// - Anma günlerinde (10 Kasım) özel post paylaşılana kadar o sabah başka post atılmaz.

import fs from "node:fs";

// Fotoğraflar elle seçildi; Wikimedia Commons'ta kamu malı (public domain) işaretli arşiv fotoğrafları (assets/special).
//  ataturk.jpg   = "Ataturk1930s.jpg" (1930'lar portre)
//  canakkale.jpg = "Mustafa Kemal in Gallipoli.jpg" (1915, Çanakkale)
// Otomatik fotoğraf seçimi YAPILMAZ.
const ATATURK = { file: "assets/special/ataturk.jpg", focus: { x: 0.5, y: 0.3 } };
const CANAKKALE = { file: "assets/special/canakkale.jpg", focus: { x: 0.45, y: 0.4 } };

/** n: yıl dönümü sayısını verir. */
const since = (y0) => (year) => year - y0;

export const SPECIAL_DAYS = [
  {
    id: "18-mart", photo: CANAKKALE, md: "03-18", mood: "anma", publishHour: 9,
    kicker: "18 Mart 1915",
    title: () => "Çanakkale Zaferi'nin yıl dönümü",
    subtitle: (y) => `${since(1915)(y)}. yıl dönümünde tüm şehitlerimizi rahmet ve minnetle anıyoruz.`,
    caption: (y) => `18 Mart Şehitleri Anma Günü ve Çanakkale Deniz Zaferi'nin ${since(1915)(y)}. yıl dönümünde tüm şehitlerimizi rahmet ve minnetle anıyoruz.`,
    hashtags: ["18Mart", "ÇanakkaleGeçilmez", "ŞehitlerimiziAnıyoruz"],
  },
  {
    id: "23-nisan", photo: ATATURK, md: "04-23", mood: "bayram", publishHour: 9,
    kicker: "23 Nisan 1920",
    title: () => "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun",
    subtitle: (y) => `Türkiye Büyük Millet Meclisi'nin açılışının ${since(1920)(y)}. yıl dönümü.`,
    caption: (y) => `23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun.\n\nTürkiye Büyük Millet Meclisi'nin açılışının ${since(1920)(y)}. yıl dönümünde başta Gazi Mustafa Kemal Atatürk olmak üzere Meclis'in kurucularını saygı ve minnetle anıyoruz.`,
    hashtags: ["23Nisan", "UlusalEgemenlikveÇocukBayramı"],
  },
  {
    id: "19-mayis", photo: ATATURK, md: "05-19", mood: "bayram", publishHour: 9,
    kicker: "19 Mayıs 1919",
    title: () => "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı kutlu olsun",
    subtitle: (y) => `Gazi Mustafa Kemal Atatürk'ün Samsun'a çıkışının ${since(1919)(y)}. yıl dönümü.`,
    caption: (y) => `19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı kutlu olsun.\n\nGazi Mustafa Kemal Atatürk'ün Samsun'a çıkışının ${since(1919)(y)}. yıl dönümünde Atatürk'ü ve silah arkadaşlarını saygı ve minnetle anıyoruz.`,
    hashtags: ["19Mayıs", "GençlikveSporBayramı", "Atatürk"],
  },
  {
    id: "30-agustos", photo: ATATURK, md: "08-30", mood: "bayram", publishHour: 9,
    kicker: "30 Ağustos 1922",
    title: () => "30 Ağustos Zafer Bayramı kutlu olsun",
    subtitle: (y) => `Büyük Zafer'in ${since(1922)(y)}. yıl dönümü.`,
    caption: (y) => `30 Ağustos Zafer Bayramı kutlu olsun.\n\nBüyük Zafer'in ${since(1922)(y)}. yıl dönümünde Başkomutan Gazi Mustafa Kemal Atatürk'ü saygıyla, tüm şehitlerimizi rahmetle anıyoruz.`,
    hashtags: ["30Ağustos", "ZaferBayramı"],
  },
  {
    id: "29-ekim", photo: ATATURK, md: "10-29", mood: "bayram", publishHour: 9,
    kicker: "29 Ekim 1923",
    title: () => "Cumhuriyet Bayramımız kutlu olsun",
    subtitle: (y) => `Cumhuriyetimizin ${since(1923)(y)}. yılı.`,
    caption: (y) => `29 Ekim Cumhuriyet Bayramımız kutlu olsun.\n\nCumhuriyetimizin ${since(1923)(y)}. yılında başta Cumhuriyetimizin kurucusu Gazi Mustafa Kemal Atatürk olmak üzere emeği geçen herkesi saygı ve minnetle anıyoruz.`,
    hashtags: ["29Ekim", "CumhuriyetBayramı"],
  },
  {
    id: "10-kasim", photo: ATATURK, md: "11-10", mood: "anma", publishHour: 9, blockMorning: true,
    kicker: "10 Kasım 1938",
    title: () => "Gazi Mustafa Kemal Atatürk'ü saygı ve özlemle anıyoruz",
    subtitle: (y) => `Ebediyete intikalinin ${since(1938)(y)}. yılı.`,
    caption: (y) => `Cumhuriyetimizin kurucusu Gazi Mustafa Kemal Atatürk'ü ebediyete intikalinin ${since(1938)(y)}. yılında saygı, sevgi ve özlemle anıyoruz.`,
    hashtags: ["10Kasım", "Atatürk", "AtatürküAnıyoruz"],
  },
];

const md = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** now: TR yerel tarih. Bugün ya da önümüzdeki 2 gün içindeki özel gün: { spec, date: "YYYY-MM-DD", year, key } */
export function upcomingSpecial(now) {
  for (let i = 0; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const spec = SPECIAL_DAYS.find((s) => s.md === md(d));
    if (spec) {
      const date = `${d.getFullYear()}-${md(d)}`;
      return { spec, date, year: d.getFullYear(), key: `${spec.id}:${d.getFullYear()}`, daysLeft: i };
    }
  }
  return null;
}

/** Sabit metinlerden post içeriği (tek slayt + caption). */
export function specialContent(spec, year) {
  const tags = spec.hashtags.map((h) => `#${h}`).join(" ");
  const photo = spec.photo && fs.existsSync(spec.photo.file) ? { buf: fs.readFileSync(spec.photo.file), focus: spec.photo.focus } : null;
  return { kicker: spec.kicker, title: spec.title(year), subtitle: spec.subtitle(year), mood: spec.mood, photo, caption: `${spec.caption(year)}\n\n${tags}` };
}
