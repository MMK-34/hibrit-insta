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
  maxPerDay: 12,
  perRun: 2, // bir çalışmada en fazla (2 saatte bir çalışır)
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
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22Atletizm+Federasyonu%22+OR+%22milli+atlet%22+OR+%22T%C3%BCrk+atlet%22+when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "genel" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=triatlon+OR+%22Ironman+70.3+T%C3%BCrkiye%22+OR+%22Challenge+Turkey%22+OR+duatlon+when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  // Türkiye: HYROX, CrossFit (Eurasia/Tirana Throwdown dahil), fonksiyonel/OCR
  { source: "Google News", url: "https://news.google.com/rss/search?q=HYROX+when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "hyrox" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=CrossFit+OR+Throwdown+when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "crossfit" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=kalistenik+OR+%22Spartan+Race%22+OR+%22fonksiyonel+antrenman%22+OR+%22hibrit+antrenman%22+OR+%22fitness+yar%C4%B1%C5%9Fmas%C4%B1%22+OR+%22fitness+%C5%9Fampiyonas%C4%B1%22+when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "fonksiyonel" },
  // Dünya: doğrudan RSS
  // Kaldırıldı: Morning Chalk Up (CloudFront 403), crossfit.com/feed (RSS değil, HTML döndürüyor).
  { source: "BOXROX", url: "https://www.boxrox.com/feed/", cat: "crossfit" },
  { source: "The Barbell Spin", url: "https://thebarbellspin.com/feed/", cat: "crossfit" },
  { source: "Rox Lyfe", url: "https://roxlyfe.com/feed/", cat: "hyrox" },
  { source: "Runner's World", url: "https://www.runnersworld.com/rss/all.xml/", cat: "kosu" },
  { source: "iRunFar", url: "https://www.irunfar.com/feed", cat: "kosu" },
  { source: "LetsRun", url: "https://www.letsrun.com/feed/", cat: "kosu" },
  { source: "Triathlete", url: "https://www.triathlete.com/feed/", cat: "kosu" },
  { source: "Trail Runner", url: "https://trailrunnermag.com/feed/", cat: "kosu" },
  { source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/health_medicine/fitness.xml", cat: "fonksiyonel" },
  // Dünya: HYROX, CrossFit, fonksiyonel yarışlar
  { source: "Google News", url: "https://news.google.com/rss/search?q=HYROX+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "hyrox" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22CrossFit+Games%22+OR+%22CrossFit+Open%22+OR+%22CrossFit+Semifinals%22+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "crossfit" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22World+Fitness+Project%22+OR+%22Rogue+Invitational%22+OR+Wodapalooza+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "crossfit" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22Spartan+Race%22+OR+%22OCR+World+Championships%22+OR+%22DEKA%22+fitness+when%3A14d&hl=en-US&gl=US&ceid=US:en", cat: "fonksiyonel" },
  // Dünya: koşu, ultra, triatlon (World Athletics ve World Triathlon'un RSS'i yok/eski; site: sorgusu kullanılıyor)
  { source: "Google News", url: "https://news.google.com/rss/search?q=site%3Aworldathletics.org+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22marathon+world+record%22+OR+%22World+Marathon+Majors%22+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=UTMB+OR+%22ultra-trail%22+OR+ultramarathon+OR+%22Western+States+100%22+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=site%3Atriathlon.org+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=IRONMAN+triathlon+OR+%22T100+Triathlon%22+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "kosu" },
  // Diğer bireysel branşlar (takım/top sporları kapsam dışı; seçici ayrıca eler)
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22milli%20g%C3%BCre%C5%9F%C3%A7i%22%20OR%20%22milli%20boks%C3%B6r%22%20OR%20%22milli%20judocu%22%20OR%20%22milli%20tekvandocu%22%20OR%20%22milli%20karateci%22%20OR%20%22milli%20eskrimci%22%20when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "dovus" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22milli%20halterci%22%20OR%20%22milli%20y%C3%BCz%C3%BCc%C3%BC%22%20OR%20%22milli%20ok%C3%A7u%22%20OR%20%22milli%20cimnastik%C3%A7i%22%20OR%20%22milli%20at%C4%B1c%C4%B1%22%20OR%20%22milli%20k%C3%BCrek%C3%A7i%22%20OR%20%22milli%20kanocu%22%20when%3A7d&hl=tr&gl=TR&ceid=TR:tr", cat: "olimpik" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22Cumhurba%C5%9Fkanl%C4%B1%C4%9F%C4%B1%20Bisiklet%20Turu%22%20OR%20%22milli%20bisiklet%C3%A7i%22%20OR%20%22spor%20t%C4%B1rman%C4%B1%C5%9F%22%20OR%20%22milli%20t%C4%B1rman%C4%B1%C5%9F%C3%A7%C4%B1%22%20OR%20%22milli%20yelkenci%22%20OR%20%22a%C3%A7%C4%B1k%20su%20y%C3%BCzme%22%20when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "genel" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=(%22Avrupa%20%C5%9Fampiyonu%22%20OR%20%22d%C3%BCnya%20%C5%9Fampiyonu%22%20OR%20%22alt%C4%B1n%20madalya%22%20OR%20%22T%C3%BCrkiye%20rekoru%22)%20milli%20sporcu%20-futbol%20-basketbol%20-voleybol%20-hentbol%20when%3A3d&hl=tr&gl=TR&ceid=TR:tr", cat: "genel" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22world%20record%22%20(swimming%20OR%20weightlifting%20OR%20cycling%20OR%20climbing%20OR%20rowing%20OR%20gymnastics)%20when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "genel" },
  // Branş kaynakları (2026-11-08 kaynak taramasında RSS olarak doğrulandı)
  { source: "Türkiye Halter Federasyonu", url: "https://www.halter.gov.tr/feed/", cat: "kuvvet" },
  { source: "Türkiye Okçuluk Federasyonu", url: "https://www.okculuk.org.tr/feed/", cat: "olimpik" },
  { source: "Türkiye Cimnastik Federasyonu", url: "https://www.tcf.gov.tr/feed/", cat: "olimpik" },
  { source: "World Rowing", url: "https://worldrowing.com/feed/", cat: "su" },
  { source: "SwimSwam", url: "https://swimswam.com/feed/", cat: "su" },
  { source: "Cyclingnews", url: "https://www.cyclingnews.com/feeds.xml", cat: "bisiklet" },
  { source: "Slowtwitch", url: "https://www.slowtwitch.com/feed", cat: "kosu" },
  { source: "Gripped", url: "https://gripped.com/feed/", cat: "doga" },
  { source: "Alpinist", url: "https://www.alpinist.com/feed/", cat: "doga" },
  { source: "mysportscience", url: "https://www.mysportscience.com/blog-feed.xml", cat: "genel" },
  { source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/health_medicine/sports_medicine.xml", cat: "genel" },
  // Türkiye: yerel ve amatör yarışlar (her branş)
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22ultra%20trail%22%20OR%20%22trail%20ko%C5%9Fusu%22%20OR%20%22do%C4%9Fa%20ko%C5%9Fusu%22%20when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "doga" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22yar%C4%B1%20maratonu%22%20when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22granfondo%22%20OR%20%22gran%20fondo%22%20when%3A14d&hl=tr&gl=TR&ceid=TR:tr", cat: "bisiklet" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22k%C3%BCrek%20yar%C4%B1%C5%9F%C4%B1%22%20OR%20%22k%C3%BCrek%20%C5%9Fampiyonas%C4%B1%22%20OR%20%22deniz%20k%C3%BCre%C4%9Fi%22%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "su" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22a%C3%A7%C4%B1k%20su%22%20y%C3%BCzme%20yar%C4%B1%C5%9F%C4%B1%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "su" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22kano%20yar%C4%B1%C5%9F%C4%B1%22%20OR%20%22kano%20maratonu%22%20OR%20%22SUP%20yar%C4%B1%C5%9F%C4%B1%22%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "su" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=duatlon%20OR%20aquatlon%20OR%20%22triatlon%20yar%C4%B1%C5%9F%C4%B1%22%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "kosu" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=bouldering%20OR%20%22spor%20t%C4%B1rman%C4%B1%C5%9F%22%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "doga" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=powerlifting%20OR%20strongman%20OR%20%22bilek%20g%C3%BCre%C5%9Fi%22%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "kuvvet" },
  { source: "Google News", url: "https://news.google.com/rss/search?q=%22da%C4%9F%20bisikleti%22%20yar%C4%B1%C5%9F%C4%B1%20OR%20MTB%20yar%C4%B1%C5%9F%C4%B1%20when%3A30d&hl=tr&gl=TR&ceid=TR:tr", cat: "bisiklet" },
  // Spor bilimi
  { source: "Google News", url: "https://news.google.com/rss/search?q=exercise+study+endurance+OR+%22strength+training%22+study+when%3A7d&hl=en-US&gl=US&ceid=US:en", cat: "fonksiyonel" },
];

// Stok (kalıcı bilgi) post konuları: haber çıkmayan günlerde sırayla paylaşılır. Her biri kaynaklı yazılır.
// Liste bitince başa dönülür; yeni konu eklemek için buraya satır ekle.
export const STOCK_TOPICS = [
  { id: "hyrox-format", cat: "hyrox", title: "HYROX formatı: 8 km koşu + 8 istasyon", brief: "HYROX yarışının yapısı, istasyonların sırası, mesafeler ve tekrarlar (resmî kural kitabına göre)" },
  { id: "hyrox-divisions", cat: "hyrox", title: "HYROX kategorileri: Open, Pro, Doubles, Relay", brief: "Kategoriler arasındaki farklar, ağırlıklar ve kimler için uygun olduğu" },
  { id: "halter-kaldirislar", cat: "kuvvet", title: "Halterde koparma ve silkme", brief: "Olimpik halterin iki kaldırışı, siklet ve toplam sistemi (IWF teknik kuralları)" },
  { id: "hyrox-roxzone", cat: "hyrox", title: "Roxzone nedir, neden süre kaybettirir?", brief: "Roxzone tanımı ve yarış süresine etkisi" },
  { id: "hyrox-wallball", cat: "hyrox", title: "HYROX wall ball standartları", brief: "Top ağırlıkları, hedef yükseklikleri ve geçerli tekrar kuralları" },
  { id: "gures-stiller", cat: "dovus", title: "Grekoromen ve serbest güreş farkı", brief: "İki olimpik güreş stilinin kuralları ve puanlama farkları (United World Wrestling kuralları)" },
  { id: "hyrox-sled", cat: "hyrox", title: "Sled push ve sled pull: ağırlıklar ve kurallar", brief: "Kategorilere göre kızak ağırlıkları ve geçerli hareket standartları" },
  { id: "crossfit-open", cat: "crossfit", title: "CrossFit Open nedir, nasıl katılınır?", brief: "Open formatı, kayıt süreci, skor gönderme ve Türkiye'den katılım" },
  { id: "yuzme-stiller", cat: "su", title: "Yüzmenin dört stili ve kuralları", brief: "Serbest, sırtüstü, kurbağalama ve kelebek stillerinin teknik kuralları ve karışık yarış sırası (World Aquatics)" },
  { id: "crossfit-girls", cat: "crossfit", title: "Benchmark WOD'lar: Fran, Grace, Helen", brief: "Klasik benchmark antrenmanlarının içeriği ve neden ölçüt olarak kullanıldıkları" },
  { id: "crossfit-hero", cat: "crossfit", title: "Hero WOD geleneği ve Murph", brief: "Hero WOD'ların ortaya çıkışı ve Murph antrenmanının içeriği" },
  { id: "tirmanis-disiplinler", cat: "doga", title: "Spor tırmanışında boulder, lider ve hız", brief: "Üç tırmanış disiplininin formatı ve puanlama sistemi (IFSC kuralları)" },
  { id: "crossfit-scaling", cat: "crossfit", title: "Scaling: Rx, Scaled ve Foundations", brief: "CrossFit'te ölçekleme seviyeleri ve doğru seviyeyi seçmek" },
  { id: "run-zone2", cat: "kosu", title: "Zone 2 antrenmanı nedir?", brief: "Düşük yoğunluklu dayanıklılık antrenmanının fizyolojisi ve bilimsel kanıtları" },
  { id: "bisiklet-grand-tour", cat: "bisiklet", title: "Bisiklette üç büyük tur", brief: "Tour de France, Giro d'Italia ve Vuelta a España'nın formatı, mesafeleri ve formaları (resmî organizasyon bilgileri)" },
  { id: "run-8020", cat: "kosu", title: "80/20 yoğunluk dağılımı", brief: "Elit dayanıklılık sporcularında polarize antrenman araştırmaları" },
  { id: "run-taper", cat: "kosu", title: "Yarış öncesi taper", brief: "Yarıştan önce antrenman yükünü azaltmanın bilimsel temelleri" },
  { id: "powerlifting", cat: "kuvvet", title: "Powerlifting: squat, bench press, deadlift", brief: "Üç kaldırışın yarışma standartları ve hakem kuralları (IPF teknik kuralları)" },
  { id: "run-carb", cat: "kosu", title: "Maraton öncesi karbonhidrat yükleme", brief: "Karbonhidrat yüklemenin performansa etkisi ve spor beslenmesi kılavuzlarındaki öneriler" },
  { id: "run-shoes", cat: "kosu", title: "Koşu ayakkabısının ömrü", brief: "Ayakkabı ömrü ve yaralanma riskiyle ilgili araştırmalar" },
  { id: "okculuk-olimpik", cat: "olimpik", title: "Olimpik okçulukta mesafe ve puanlama", brief: "Olimpik yay, 70 metre mesafe, hedef ve set sistemi (World Archery kuralları)" },
  { id: "run-tr-marathons", cat: "kosu", title: "Türkiye'nin uluslararası maratonları", brief: "Türkiye'de düzenlenen uluslararası maraton ve yarı maratonlar (İstanbul, Antalya Runatolia vb.) ve parkur özellikleri" },
  { id: "sci-protein", cat: "bilim", title: "Sporcular ne kadar protein almalı?", brief: "ISSN pozisyon bildirisine göre günlük protein ihtiyacı ve zamanlama" },
  { id: "kurek-2000", cat: "su", title: "Kürekte 2000 metre standardı", brief: "Olimpik kürek yarış mesafesi, tekne sınıfları ve ergometre testlerinin kullanımı (World Rowing)" },
  { id: "sci-creatine", cat: "bilim", title: "Kreatin: bilimsel olarak ne biliniyor?", brief: "ISSN kreatin pozisyon bildirisi, etkileri ve güvenliği" },
  { id: "sci-caffeine", cat: "bilim", title: "Kafein ve performans", brief: "ISSN kafein pozisyon bildirisine göre doz ve zamanlama" },
  { id: "jimnastik-puan", cat: "olimpik", title: "Artistik jimnastikte D ve E puanı", brief: "Zorluk ve uygulama puanlarının nasıl hesaplandığı (FIG puanlama kuralları)" },
  { id: "sci-sleep", cat: "bilim", title: "Uyku ve toparlanma", brief: "Uykunun sporcu performansı ve toparlanma üzerindeki etkisine dair araştırmalar" },
  { id: "sci-hydration", cat: "bilim", title: "Antrenmanda sıvı ve elektrolit", brief: "ACSM sıvı alımı önerileri ve terlemeyle kayıp" },
  { id: "dag-irtifa", cat: "doga", title: "Yükseklik hastalığı ve aklimatizasyon", brief: "Akut dağ hastalığının belirtileri ve aklimatizasyon önerileri (Wilderness Medical Society kılavuzu)" },
  { id: "sci-warmup", cat: "bilim", title: "Doğru ısınma nasıl yapılır?", brief: "Dinamik ısınmanın performans ve yaralanma riskine etkisi (araştırmalar)" },
  { id: "sci-vo2max", cat: "kosu", title: "VO2max nedir, nasıl gelişir?", brief: "VO2max tanımı ve geliştirmeye yönelik antrenman yöntemlerinin kanıtları" },
  { id: "boks-olimpik", cat: "dovus", title: "Olimpik boksta puanlama", brief: "Olimpik boksta raunt sayısı, hakem puanlama sistemi ve temel kurallar (resmî olimpik boks kuralları)" },
  { id: "func-kettlebell", cat: "fonksiyonel", title: "Kettlebell swing: teknik ve faydaları", brief: "Kettlebell swing tekniği ve araştırmalardaki etkileri" },
  { id: "func-hybrid", cat: "fonksiyonel", title: "Hibrit antrenman: kuvvet ve dayanıklılık birlikte", brief: "Eş zamanlı antrenman (concurrent training) etkisi üzerine araştırmalar" },
  { id: "tri-distances", cat: "kosu", title: "Triatlon mesafeleri: Sprint'ten Ironman'e", brief: "Resmî triatlon mesafeleri (World Triathlon, IRONMAN)" },
  { id: "ocr-spartan", cat: "fonksiyonel", title: "Spartan Race formatları", brief: "Sprint, Super, Beast mesafeleri ve engel cezaları (resmî kurallar)" },
];
