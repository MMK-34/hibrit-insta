// Tek yerden ayarlar. Logo hazır olunca logoPath'i doldur (şeffaf PNG, yatay).
export const BRAND = {
  name: "Hibrit Portal",
  mark: "H",
  handle: "@hibritportal", // Instagram kullanıcı adı kesinleşince güncelle
  logoPath: "", // örn. "assets/logo.png"
};

export const POSTING = {
  timezone: "Europe/Istanbul",
  maxPerDay: 5,
  minPerDay: 1,
  // Haber yaşı sınırı (saat): bundan eski haber paylaşılmaz
  maxAgeHours: 48,
  // Bir haberin "şimdi paylaşılır" sayılması için gereken minimum önem puanı (1-10)
  minScore: 7,
  // Günün ilk çalışması (sabah) en az bir paylaşım garanti eder
  morningHour: 9,
};

// Seçim (çok aday, kısa çıktı) Sonnet; yazım ve editör kontrolü en iyi Türkçe için Opus.
export const MODEL = "claude-sonnet-5-5";
export const MODEL_WRITE = "claude-opus-5-5";

// RSS kaynakları. Metin kopyalanmaz; özet kendi cümlelerimizle yazılır, kaynak belirtilir.
export const FEEDS = [
  { source: "BOXROX", url: "https://www.boxrox.com/feed/", cat: "crossfit" },
  { source: "Morning Chalk Up", url: "https://morningchalkup.com/feed/", cat: "crossfit" },
  { source: "CrossFit", url: "https://www.crossfit.com/feed", cat: "crossfit" },
  { source: "The Barbell Spin", url: "https://thebarbellspin.com/feed/", cat: "crossfit" },
  { source: "Rox Lyfe", url: "https://roxlyfe.com/feed/", cat: "hyrox" },
  { source: "Runner's World", url: "https://www.runnersworld.com/rss/all.xml/", cat: "kosu" },
  { source: "iRunFar", url: "https://www.irunfar.com/feed", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=HYROX&hl=en-US&gl=US&ceid=US:en", cat: "hyrox" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22CrossFit+Games%22+OR+%22CrossFit+Open%22&hl=en-US&gl=US&ceid=US:en", cat: "crossfit" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=HYROX+OR+CrossFit+OR+maraton&hl=tr&gl=TR&ceid=TR:tr", cat: "genel" },
  // Türkiye: yarışlar, maratonlar, etkinlik duyuruları
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22%C4%B0stanbul+Maratonu%22+OR+%22%C4%B0stanbul+Yar%C4%B1+Maratonu%22&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=HYROX+T%C3%BCrkiye+OR+%22HYROX+%C4%B0stanbul%22&hl=tr&gl=TR&ceid=TR:tr", cat: "hyrox" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=CrossFit+yar%C4%B1%C5%9Fma+OR+CrossFit+%C5%9Fampiyona&hl=tr&gl=TR&ceid=TR:tr", cat: "crossfit" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=maraton+ko%C5%9Fu+yar%C4%B1%C5%9F%C4%B1+OR+ultra+maraton+OR+yar%C4%B1+maraton&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=fonksiyonel+antrenman+OR+fitness+yar%C4%B1%C5%9Fmas%C4%B1&hl=tr&gl=TR&ceid=TR:tr", cat: "fonksiyonel" },
  // Dünya: büyük yarışlar, rekorlar
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22HYROX+World+Championships%22+OR+%22HYROX+Elite+15%22&hl=en-US&gl=US&ceid=US:en", cat: "hyrox" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=marathon+world+record+OR+%22World+Marathon+Majors%22&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22World+Fitness+Project%22+OR+%22Rogue+Invitational%22+OR+Wodapalooza&hl=en-US&gl=US&ceid=US:en", cat: "crossfit" },
  { source: "LetsRun", url: "https://www.letsrun.com/feed/", cat: "kosu" },
];
