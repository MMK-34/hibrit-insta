// Tek yerden ayarlar. Logo hazır olunca logoPath'i doldur (şeffaf PNG, yatay).
export const BRAND = {
  name: "Hibrit Portal",
  mark: "H",
  handle: "@hibritportal", // Instagram kullanıcı adı kesinleşince güncelle
  logoPath: "", // örn. "assets/logo.png"
};

export const POSTING = {
  timezone: "Europe/Istanbul",
  // Sabit kota yok: haber oldukça paylaşılır. Bu sınırlar yalnızca spam/aşırı maliyet emniyeti.
  maxPerDay: 30,
  perRun: 4, // bir çalışmada en fazla (saatte bir çalışır)
  // Ücretli taslak (yazım + iki doğrulayıcı) için günlük maliyet emniyeti
  maxDraftsPerDay: 30,
  // Bilgi + araştırma postları günde en fazla (haber ve hikâye sınırsız)
  maxInfoPerDay: 4,
  minPerDay: 1,
  // Haber yaşı sınırı (saat): bundan eski haber paylaşılmaz
  maxAgeHours: 48,
  // Bir haberin "şimdi paylaşılır" sayılması için gereken minimum önem puanı (1-10)
  minScore: 7,
  // Günün ilk çalışması (sabah) en az bir paylaşım garanti eder
  morningHour: 9,
  // Her paylaşımın kapağı hikâye (Story) olarak da paylaşılır (erişim); false ile kapatılır
  stories: true,
};

// Seçim (çok aday, kısa çıktı) Sonnet; yazım ve editör kontrolü en iyi Türkçe için Opus.
export const MODEL = "claude-sonnet-5-5";
export const MODEL_WRITE = "claude-opus-5-5";

// RSS kaynakları. Metin kopyalanmaz; özet kendi cümlelerimizle yazılır, kaynak belirtilir.
export const FEEDS = [
  // Not: Google News sonuçları alaka sırasıyla gelir ve collect() yalnızca ilk 25 öğeye bakar;
  // bu yüzden sorgulara "when:7d" / "when:14d" eklendi (taze haber öne gelsin). 48 saat filtresi collect'te.
  // Türkiye: resmî kaynaklar (doğrudan RSS)
  { source: "Türkiye Atletizm Federasyonu", url: "https://taf.org.tr/feed/", cat: "kosu" },
  { source: "Spor İstanbul", url: "https://spor.istanbul/feed/", cat: "kosu" },
  // Türkiye: maratonlar, kayıt duyuruları, şehir yarışları
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22%C4%B0stanbul+Maratonu%22+OR+%22%C4%B0stanbul+Yar%C4%B1+Maratonu%22+OR+%22Spor+%C4%B0stanbul%22+when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22yar%C4%B1+maratonu%22+OR+%22halk+ko%C5%9Fusu%22+OR+%22maratonu+kay%C4%B1tlar%C4%B1%22+OR+%22maraton+kay%C4%B1tlar%C4%B1%22+when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=Runatolia+OR+%22Antalya+Maratonu%22+OR+%22%C4%B0zmir+Maratonu%22+OR+%22Mersin+Maratonu%22+OR+%22Ankara+Yar%C4%B1+Maratonu%22+OR+%22Trabzon+Yar%C4%B1+Maratonu%22+OR+%22Kapadokya+Ultra%22+OR+%22Cappadocia+Ultra%22+when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  // Türkiye: ultra/patika, atletizm, triatlon
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22ultra+maraton%22+OR+%22ultra+trail%22+OR+%22patika+ko%C5%9Fusu%22+OR+%22da%C4%9F+ko%C5%9Fusu%22+OR+%22trail+ko%C5%9Fu%22+-y%C3%BCz%C3%BCc%C3%BC+-y%C3%BCz%C3%BCc%C3%BCs%C3%BC+when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=triatlon+OR+%22Ironman+70.3+T%C3%BCrkiye%22+OR+%22Challenge+Turkey%22+OR+duatlon+when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  // Türkiye: HYROX, CrossFit (Eurasia/Tirana Throwdown dahil), fonksiyonel/OCR
  { source: "Google News", url: "https://news.google.com/rss/search?q=HYROX+when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "hyrox" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=CrossFit+OR+Throwdown+when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "crossfit" },
  // Dünya: doğrudan RSS
  // Kaldırıldı: Morning Chalk Up (CloudFront 403), crossfit.com/feed (RSS değil, HTML döndürüyor).
  { source: "BOXROX", url: "https://www.boxrox.com/feed/", cat: "crossfit" },
  { source: "The Barbell Spin", url: "https://thebarbellspin.com/feed/", cat: "crossfit" },
  { source: "Rox Lyfe", url: "https://roxlyfe.com/feed/", cat: "hyrox" },
  { source: "Runner's World", url: "https://www.runnersworld.com/rss/all.xml/", cat: "kosu" },
  { source: "iRunFar", url: "https://www.irunfar.com/feed", cat: "kosu" },
  { source: "Triathlete", url: "https://www.triathlete.com/feed/", cat: "kosu" },
  { source: "Trail Runner", url: "https://trailrunnermag.com/feed/", cat: "kosu" },
  { source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/health_medicine/fitness.xml", cat: "fonksiyonel" },
  // Dünya: HYROX, CrossFit, fonksiyonel yarışlar
  { source: "Google News", url: "https://news.google.com/rss/search?q=HYROX+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "hyrox" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22CrossFit+Games%22+OR+%22CrossFit+Open%22+OR+%22CrossFit+Semifinals%22+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "crossfit" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22World+Fitness+Project%22+OR+%22Rogue+Invitational%22+OR+Wodapalooza+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "crossfit" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22Spartan+Race%22+OR+%22OCR+World+Championships%22+OR+%22DEKA%22+fitness+when%3A14d&hl=en-US&gl=US&ceid=US:en", cat: "fonksiyonel" },
  // Dünya: koşu, ultra, triatlon (World Athletics ve World Triathlon'un RSS'i yok/eski; site: sorgusu kullanılıyor)
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22marathon+world+record%22+OR+%22World+Marathon+Majors%22+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=UTMB+OR+%22ultra-trail%22+OR+ultramarathon+OR+%22Western+States+100%22+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=IRONMAN+triathlon+OR+%22IRONMAN+70.3%22+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  // Kürek, triatlon, spor bilimi (RSS olarak doğrulandı)
  { source: "mysportscience", url: "https://www.mysportscience.com/blog-feed.xml", cat: "genel" },
  { source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/health_medicine/sports_medicine.xml", cat: "genel" },
  // Türkiye: yerel ve amatör yarışlar
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22ultra%20trail%22%20OR%20%22trail%20ko%C5%9Fusu%22%20OR%20%22do%C4%9Fa%20ko%C5%9Fusu%22%20when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "doga" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22yar%C4%B1%20maratonu%22%20when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22granfondo%22%20OR%20%22gran%20fondo%22%20when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "bisiklet" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22k%C3%BCrek%20yar%C4%B1%C5%9F%C4%B1%22%20OR%20%22k%C3%BCrek%20%C5%9Fampiyonas%C4%B1%22%20OR%20%22deniz%20k%C3%BCre%C4%9Fi%22%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "su" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22a%C3%A7%C4%B1k%20su%22%20y%C3%BCzme%20yar%C4%B1%C5%9F%C4%B1%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "su" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=duatlon%20OR%20aquatlon%20OR%20%22triatlon%20yar%C4%B1%C5%9F%C4%B1%22%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  // Hibrit fitness yarışları (ATHX, DEKA, HYROX benzeri) ve OCR
  { source: "Google News", url: "https://news.google.com/rss/search?q=ATHX%20OR%20%22hibrit%20fitness%22%20OR%20%22hybrid%20fitness%20yar%C4%B1%C5%9F%C4%B1%22%20OR%20%22Spartan%20Race%22%20OR%20%22fonksiyonel%20antrenman%22%20OR%20%22hibrit%20antrenman%22%20when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "fonksiyonel" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=ATHX%20OR%20%22hybrid%20fitness%20race%22%20OR%20%22hybrid%20racing%22%20OR%20%22DEKA%20FIT%22%20OR%20%22fitness%20racing%22%20when%3A14d&hl=en-US&gl=US&ceid=US:en", cat: "fonksiyonel" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22indoor%20rowing%22%20OR%20%22Concept2%22%20OR%20%22World%20Rowing%20Indoor%22%20OR%20%22ergometer%22%20rowing%20when%3A30d&hl=en-US&gl=US&ceid=US:en", cat: "su" },
  // Spor bilimi
  { source: "Google News", url: "https://news.google.com/rss/search?q=exercise+study+endurance+OR+%22strength+training%22+study+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "fonksiyonel" },
];

// Stok (kalıcı bilgi) post konuları: haber çıkmayan günlerde sırayla paylaşılır. Her biri kaynaklı yazılır.
// Liste bitince başa dönülür; yeni konu eklemek için buraya satır ekle.
export const STOCK_TOPICS = [
  { id: "ilk-10k", cat: "kosu", title: "İlk 10K koşunuzdan önce yapmanız gerekenler", brief: "İlk 10 km halk koşusuna katılacak amatör için: kayıt ve göğüs numarası teslimi, son hafta antrenman azaltma, yarış sabahı beslenme ve ısınma, tempo planı, yarış günü kontrol listesi (TAF yol koşusu kuralları, spor beslenmesi kılavuzları ve güvenilir koşu kaynakları)" },
  { id: "ilk-crossfit-yarisi", cat: "crossfit", title: "İlk CrossFit yarışmanızdan önce bilmeniz gerekenler", brief: "İlk throwdown ya da takım yarışmasına girecek amatör için: Rx/Scaled kategori seçimi, hareket standartları ve hakemlik (no rep), ısınma alanı, workout'lar arası toparlanma ve beslenme, yanınıza alacaklarınız (CrossFit resmî hakem kursu/kural kaynakları)" },
  { id: "ilk-hyrox", cat: "hyrox", title: "İlk HYROX yarışınızdan önce yapmanız gerekenler", brief: "İlk HYROX'una girecek sporcu için: kategori seçimi (Open, Pro, Doubles, Relay), istasyon sırası ve standartlar, Roxzone, tempo stratejisi, yarış günü kontrol listesi (HYROX resmî kural kitabı)" },
  { id: "ilk-trail", cat: "doga", title: "İlk trail koşunuzdan önce bilmeniz gerekenler", brief: "İlk patika/trail yarışına girecek koşucu için: parkur uzunluğu ve irtifa farkı, zorunlu malzeme, ayakkabı seçimi, kontrol noktaları ve zaman sınırları (cut-off), inişte ve çıkışta tempo (ITRA ve organizatör kuralları)" },
  { id: "ilk-yari-maraton", cat: "kosu", title: "10K'dan yarı maratona geçiş", brief: "10K koşan amatörün ilk yarı maratonuna hazırlanması: haftalık hacim artışı, uzun koşu, yarışta su ve enerji alımı, yarış öncesi azaltma (araştırmalar ve antrenman kılavuzları)" },
  { id: "yaris-gunu-beslenme", cat: "bilim", title: "Yarış sabahı ne yemeli?", brief: "Kısa (5-10K) ve uzun (yarı maraton ve üstü) yarışlar ile HYROX/CrossFit yarış günü için yarış öncesi öğün zamanlaması ve karbonhidrat miktarı (ISSN ve ACSM spor beslenmesi önerileri)" },
  { id: "kurek-erg-teknik", cat: "su", title: "Ergometrede doğru kürek tekniği", brief: "Kürek ergometresinde çekiş sırası (bacak, gövde, kol), damper ayarı ve sık yapılan hatalar (Concept2 ve World Rowing kaynakları)" },
  { id: "athx-format", cat: "fonksiyonel", title: "ATHX yarış formatı", brief: "ATHX hibrit fitness yarışının bölümleri, kategorileri ve puanlama sistemi (organizatörün resmî kuralları)" },
  { id: "run-ultra-trail", cat: "doga", title: "Trail ve ultra yarışlarında zorunlu malzeme", brief: "Trail ve ultra yarışlarında istenen zorunlu malzeme listesi ve ITRA/UTMB puan sistemi (resmî kaynaklar)" },
  { id: "run-pace", cat: "kosu", title: "Hedef süreye göre maraton temposu", brief: "Maraton ve yarı maratonda hedef süreye göre kilometre temposu hesabı ve negatif split stratejisi (araştırmalar ve antrenman kaynakları)" },
  { id: "hyrox-format", cat: "hyrox", title: "HYROX formatı: 8 km koşu + 8 istasyon", brief: "HYROX yarışının yapısı, istasyonların sırası, mesafeler ve tekrarlar (resmî kural kitabına göre)" },
  { id: "hyrox-divisions", cat: "hyrox", title: "HYROX kategorileri: Open, Pro, Doubles, Relay", brief: "Kategoriler arasındaki farklar, ağırlıklar ve kimler için uygun olduğu" },
  { id: "hyrox-roxzone", cat: "hyrox", title: "Roxzone nedir, neden süre kaybettirir?", brief: "Roxzone tanımı ve yarış süresine etkisi" },
  { id: "hyrox-wallball", cat: "hyrox", title: "HYROX wall ball standartları", brief: "Top ağırlıkları, hedef yükseklikleri ve geçerli tekrar kuralları" },
  { id: "hyrox-sled", cat: "hyrox", title: "Sled push ve sled pull: ağırlıklar ve kurallar", brief: "Kategorilere göre kızak ağırlıkları ve geçerli hareket standartları" },
  { id: "crossfit-open", cat: "crossfit", title: "CrossFit Open nedir, nasıl katılınır?", brief: "Open formatı, kayıt süreci, skor gönderme ve Türkiye'den katılım" },
  { id: "crossfit-girls", cat: "crossfit", title: "Benchmark WOD'lar: Fran, Grace, Helen", brief: "Klasik benchmark antrenmanlarının içeriği ve neden ölçüt olarak kullanıldıkları" },
  { id: "crossfit-hero", cat: "crossfit", title: "Hero WOD geleneği ve Murph", brief: "Hero WOD'ların ortaya çıkışı ve Murph antrenmanının içeriği" },
  { id: "crossfit-scaling", cat: "crossfit", title: "Scaling: Rx, Scaled ve Foundations", brief: "CrossFit'te ölçekleme seviyeleri ve doğru seviyeyi seçmek" },
  { id: "run-zone2", cat: "kosu", title: "Zone 2 antrenmanı nedir?", brief: "Düşük yoğunluklu dayanıklılık antrenmanının fizyolojisi ve bilimsel kanıtları" },
  { id: "run-8020", cat: "kosu", title: "80/20 yoğunluk dağılımı", brief: "Elit dayanıklılık sporcularında polarize antrenman araştırmaları" },
  { id: "run-taper", cat: "kosu", title: "Yarış öncesi taper", brief: "Yarıştan önce antrenman yükünü azaltmanın bilimsel temelleri" },
  { id: "run-carb", cat: "kosu", title: "Maraton öncesi karbonhidrat yükleme", brief: "Karbonhidrat yüklemenin performansa etkisi ve spor beslenmesi kılavuzlarındaki öneriler" },
  { id: "run-shoes", cat: "kosu", title: "Koşu ayakkabısının ömrü", brief: "Ayakkabı ömrü ve yaralanma riskiyle ilgili araştırmalar" },
  { id: "run-tr-marathons", cat: "kosu", title: "Türkiye'nin uluslararası maratonları", brief: "Türkiye'de düzenlenen uluslararası maraton ve yarı maratonlar (İstanbul, Antalya Runatolia vb.) ve parkur özellikleri" },
  { id: "sci-protein", cat: "bilim", title: "Sporcular ne kadar protein almalı?", brief: "ISSN pozisyon bildirisine göre günlük protein ihtiyacı ve zamanlama" },
  { id: "kurek-2000", cat: "su", title: "Kürekte 2000 metre standardı", brief: "Olimpik kürek yarış mesafesi, tekne sınıfları ve ergometre testlerinin kullanımı (World Rowing)" },
  { id: "sci-creatine", cat: "bilim", title: "Kreatin: bilimsel olarak ne biliniyor?", brief: "ISSN kreatin pozisyon bildirisi, etkileri ve güvenliği" },
  { id: "sci-caffeine", cat: "bilim", title: "Kafein ve performans", brief: "ISSN kafein pozisyon bildirisine göre doz ve zamanlama" },
  { id: "sci-sleep", cat: "bilim", title: "Uyku ve toparlanma", brief: "Uykunun sporcu performansı ve toparlanma üzerindeki etkisine dair araştırmalar" },
  { id: "sci-hydration", cat: "bilim", title: "Antrenmanda sıvı ve elektrolit", brief: "ACSM sıvı alımı önerileri ve terlemeyle kayıp" },
  { id: "sci-warmup", cat: "bilim", title: "Doğru ısınma nasıl yapılır?", brief: "Dinamik ısınmanın performans ve yaralanma riskine etkisi (araştırmalar)" },
  { id: "sci-vo2max", cat: "kosu", title: "VO2max nedir, nasıl gelişir?", brief: "VO2max tanımı ve geliştirmeye yönelik antrenman yöntemlerinin kanıtları" },
  { id: "func-kettlebell", cat: "fonksiyonel", title: "Kettlebell swing: teknik ve faydaları", brief: "Kettlebell swing tekniği ve araştırmalardaki etkileri" },
  { id: "func-hybrid", cat: "fonksiyonel", title: "Hibrit antrenman: kuvvet ve dayanıklılık birlikte", brief: "Eş zamanlı antrenman (concurrent training) etkisi üzerine araştırmalar" },
  { id: "tri-distances", cat: "kosu", title: "Triatlon mesafeleri: Sprint'ten Ironman'e", brief: "Resmî triatlon mesafeleri (World Triathlon, IRONMAN)" },
  { id: "ocr-spartan", cat: "fonksiyonel", title: "Spartan Race formatları", brief: "Sprint, Super, Beast mesafeleri ve engel cezaları (resmî kurallar)" },
];
