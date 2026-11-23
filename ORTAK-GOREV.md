# ORTAK-GOREV.md — Claude Code ↔ Antigravity görev panosu

Kurallar: `AGENTS.md`. Durumlar: `bekliyor` → `yapılıyor (<ajan>)` → `inceleme bekliyor` → `bitti` (ya da `SORU`).
Yalnızca sana atanmış görevi al. Bitince altına kısa not yaz. Soruları en alttaki "Sorular" bölümüne yaz.

---

## G1 — Bağımsız sistem denetimi (rapor)
- **Atanan:** Antigravity
- **Durum:** bitti
- **Kod değiştirme yok.** Çıktı: `rapor/G1-denetim.md`
- Yapılacak: `src/run.mjs`, `src/guard.mjs`, `src/plan.mjs`, `src/event-photos.mjs`, `manual/make.mjs`,
  `.github/workflows/post.yml` dosyalarını `AGENTS.md` madde 3'teki kurallara göre baştan sona oku.
  Kuralların kodda gerçekten uygulanıp uygulanmadığını kontrol et (ör. günlük 10 post sınırı, bilgi postu kotası,
  story kotası, görsel kuralı, rakam kuralı, kategori adı yasağı).
- Her bulgu için: dosya:satır, sorun, somut örnek senaryo, önerilen düzeltme, önem (yüksek/orta/düşük).
  Emin olmadığın bulguyu "şüpheli" diye işaretle; uydurma bulgu yazma.
- Notlar:
  - `src/run.mjs`, `src/guard.mjs`, `src/plan.mjs`, `src/event-photos.mjs`, `manual/make.mjs`, `.github/workflows/post.yml` ve `src/config.mjs` baştan sona okunarak `AGENTS.md` madde 3 kurallarına göre statik kod denetimi yapıldı.
  - Rapor `rapor/G1-denetim.md` dosyasına yazıldı (hiçbir kaynak kod değiştirilmedi).
  - Öne çıkan bulgular: (1) `todayCount` çalışma içindeki yayınlarda (`processApprovals`, `publishDmTip`, `publishSeries`, `renderAndPublish`) artırılmadığı için tek çalışmada günlük 10 post sınırının aşılabilmesi, (2) `hikaye`/`seri`/`istatistik` türlerinde ve `designCheck` fotoğraf değişiminde stok fotoğrafa düşülebilmesi, (3) kişi adı geçen `publishSeries` serilerinin onaya gitmeden yayınlanması, (4) `manual/make.mjs`'nin `guardPost` sonrası `hl` alanını ham spec'ten ezmesi ve koşu 3 slayt / kredi şapka temizliğini atlaması, (5) `guard.mjs`'de `on/yüz/bin`, `Open/Pro/Age Group/Yaş Grubu`, `GBP/£/bedeli/fiyatı` boşlukları ve `publishStock`'un `infoToday` sayacını artırmaması.
  - Claude Code (2026-11-22): bulgular 1, 4, 5, 6 (3 slayt + kredi şapkası), 7, 8, 9, 10 düzeltildi. Seriler artık onaya gidiyor (statik soru serisi hariç). 2, 3 ve 11 açık: seri onayı fotoğrafı da kullanıcı kontrolüne soktu; tasarım denetimi yedeği ayrıca ele alınacak.

## G2 — Replay test paketi
- **Atanan:** Antigravity
- **Durum:** bitti
- **Branch:** `antigravity/replay-test`
- Yapılacak: `scripts/replay-test.mjs` yaz. `src/guard.mjs` içindeki kontrolleri (rakam kuralı, kategori adı,
  şapkalı harf, `hl` kontrolü vb.) örnek metinlerle test etsin: kuralı ihlal eden örnekler yakalanmalı,
  temiz örnekler (ör. "peynir altı suyu", "%0,087 seviyesine", "bir") yakalanmamalı.
  Test verisi `scripts/replay-fixtures.json` içinde dursun. Ağ veya API anahtarı gerektirmesin.
  `node scripts/replay-test.mjs` → geçen/kalan sayısı, kalan varsa çıkış kodu 1.
- Dokunulacak dosyalar: yalnızca `scripts/replay-test.mjs`, `scripts/replay-fixtures.json`.
  `src/` içinde değişiklik gerekiyorsa yapma, notlara yaz.
- Notlar:
  - `antigravity/replay-test` branch'inde `scripts/replay-test.mjs` ve `scripts/replay-fixtures.json` oluşturuldu (`src/` altında hiçbir dosyaya dokunulmadı).
  - 29 test senaryosu eklendi: temiz örnekler ("peynir altı suyu", "%0,087 seviyesine", "bir", "ikişer", eşsesli "yüz/yüzme", şapkalı harf temizliği, `hl` 3 kelime sınırı ve başlık eşleşmesi, genel hashtag filtreleme, Türkiye ATHX) ve ihlal örnekleri (yazıyla sayılar 2..10/100/1000, İngilizce/Türkçe kategori ve yaş grubu adları, TL/EUR/GBP/kayıt bedeli fiyatları, yurt dışı ATHX, yargılayıcı ifadeler, kişi sözü/alıntı, AI klişeleri, çoklu ünlem, büyük harfli alan adı, prompt injection, spam, uzun slayt metni, eksik kapak slaytı).
  - Test: `node scripts/replay-test.mjs` (29/29 geçti, çıkış kodu 0), `node --check` ve `eslint` hatasız geçti.
  - Claude Code (2026-11-22): incelendi, main'e alındı (3ca136e); post.yml kod denetimine eklendi, test kalırsa bot paylaşmaz.
  - Küçük gözlem (`src/guard.mjs:59`): `clean(s.hl).toLocaleUpperCase("tr")` İngilizce özel adlardaki küçük `i` harfini Türkçe büyük `İ`'ye çeviriyor (`"Eurasia"` -> `"EURASİA"`). Render aşamasında font/stil açısından sorun oluşturuyorsa `src/guard.mjs` içinde değerlendirilebilir.

## G3 — Takvim senkronu zaman aşımı (teşhis)
- **Atanan:** Antigravity
- **Durum:** bitti
- **Branch:** `antigravity/takvim-teshis`
- Sorun: `post.yml` → "Yarış takvimi senkronu" adımı (`cal/scripts/sync-calendar.mjs`) 240 sn'de kesiliyor:
  "takvim hatası, son sağlam veri korundu" (2026-11-22, iki çalışmada).
- Yapılacak: hangi kaynağın/isteğin takıldığını bul (istek başına zaman aşımı var mı? sıralı mı çalışıyor?).
  Önce teşhisi notlara yaz; düzeltme küçük ve net ise branch'te yap. Takvim verisi dosyalarını elle değiştirme.
- Notlar:
  - **Teşhis:** GitHub Actions (`45050762435`) loglarında `circle21` 15 sn'de tamamlanıyor (`[ok] circle21: 91`). Ardından `hyroxCalendar()` içinde birincil kaynak `hyranking.com` Actions IP'sinden `event linki bulunamadı` dönüp yedek `hyresult.com`'a düşüyor. `hyresult.com/events` sayfasında 119 etkinlik slug'ı var; her `/event/<slug>` sayfası ~1,5–2,2 sn'de yanıt veriyor ve kod bunları **sıralı** (`for` döngüsü + her istekte `sleep(350)`, istek başına 20 sn timeout) çektiği için `119 × ~2,1 sn ≈ 250+ sn` sürüyor ve 240 sn'lik `timeout 240` sınırına takılıp kesiliyor.
  - **Düzeltme (`antigravity/takvim-teshis` branch / `insta-ag-takvim-teshis` worktree):** `cal/scripts/sync-calendar.mjs` içinde `hyroxCalendar()` liste sayfaları ve etkinlik detay istekleri 6'lı paralel gruplar (`CONC = 6`, `Promise.all`, istek başına `timeout: 10000`) halinde çekilecek şekilde güncellendi (takvim veri dosyalarına dokunulmadı).
  - Claude Code (2026-11-22): incelendi, main'e alındı (060d04d).
  - **Test:** Paralel çekimle 40 slug 90+ sn yerine ~22 sn'de (119 slug ~60 sn'de) tamamlanıyor. `node --check`, `eslint` ve `node scripts/replay-test.mjs` (29/29) hatasız geçti.

## G4 — Post görsel kontrolü (rapor)
- **Atanan:** Antigravity
- **Durum:** bitti
- **Kod değiştirme yok.** Çıktı: `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\G4-gorsel.md`
- Kullanıcıdan ekran görüntüsü İSTEME. Görseller: `state/posted.json` içindeki son 30 yayınlanmış postun (`media` alanı dolu)
  `cover` adresleri (`raw.githubusercontent.com/.../media/...` kapak görseli). Bu adresleri indirip bak; Instagram'a girme.
  Kapak dışındaki slaytlar aynı klasördedir (`cover` adresindeki `01.jpg` yerine `02.jpg`, `03.jpg`... dene; yoksa yalnızca kapak).
- Her post için kontrol et: foto konuyla ilgili mi, olay postunda yalnızca olayın kendi görseli mi, yazı taşıyor mu,
  logo/yüz kesiliyor mu, kırmızı vurgu doğru kelimede mi. Sorunlu olanları başlık + adres + sorun olarak listele; sorunsuzları tek satırda say.
- Notlar:
  - `state/posted.json` içindeki son 30 yayınlanmış paylaşımın (2026-11-19 – 2026-11-22) tüm slaytları (64 görsel) `raw.githubusercontent.com` üzerinden indirilip tek tek incelendi; rapor `rapor/G4-gorsel.md` dosyasına yazıldı.
  - 12 paylaşım sorunsuz, 18 paylaşımda görsel/tasarım/kural sorunu tespit edildi.
  - Başlıca bulgular: (1) v2 kapakta `head2()` içindeki `bare(h).length >= 2` koşulu nedeniyle `"3 hafta"` gibi tek haneli sayı içeren `hl` vurgularında rakamın beyaz kalıp yalnızca kelimenin kızarması (`iF3` postu) ve `HYROX Poznań` postunda `hl` eksikliği, (2) olay/takip postlarında stok fotoğrafa düşülmesi (`HYROX Barcelona`, `St. Nicholas`, `Gazi Yarı Maratonu`, `Tirana Throwdown` -> arka planda Eurasia Throwdown/Backstreet ve bahis/kulüp/ELITE yazıları), (3) yanlış etkinlik logosu basılması (Strava haberlerinde `VU | BOX`, Ironman Vietnam/Güney Afrika haberlerinde `Oman Pro Series`, NYC Maratonu haberinde `Tokyo Marathon`), (4) bilgi/araştırma postlarında konuyla uyumsuz fotoğraf (kettlebell haberinde TRX portresi, uyku öncesi protein haberinde magnezyum tozu), (5) `HYROX · HYROX` kicker tekrarı ve `DOPING`/`CİTY`/`VUSSİ`/`DEİRDRE` büyük harf dönüşüm hataları.
  - Claude Code (2026-11-22): tekrar postlar (Gazi, Strava, Keane) ve stok fotolu olay postları bugünkü düzeltmelerden önceydi, artık engelli. Düzeltildi: çatı marka logoları (ironman/majors, circle21de hyrox/crossfit) eşleşmiyor; tek haneli hl rakamı kırmızı; HYROX · HYROX tekrarı yok. Açık: bilgi postlarında foto-konu uyumu.

## G5 — Post slayt tasarımı denemesi (yayın yok)
- **Atanan:** Antigravity
- **Durum:** bitti (alınmadı)
- **Branch / worktree:** `antigravity/tasarim` → `C:\Users\Mehmet Kuyucu\Desktop\cf\insta-ag-tasarim`
- Yapılacak: post slaytlarının tasarımını iyileştir (`src/render.mjs`, gerekirse `fonts/`). Fotoğraf ÜRETME, yapay zekâ görseli
  YOK; mevcut gerçek fotoğraflar kalır. Hedef: v2 haber sitesi stili, kırmızı vurgu (`hl`), Türkçe karakterler doğru,
  yazı taşmaz, logo/yüz kesilmez, boyut aynı kalır.
- Önce/sonra örnek: `SPEC=manual/work/posts-wwc.json node manual/make.mjs` (`--publish` YOK). Önce/sonra görselleri
  `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\G5-tasarim\once\` ve `...\sonra\` klasörlerine koy.
- Notlar:
  - Claude Code (2026-11-22): yarıda kalmış. Önce görselleri var (insta-ag-tasarim/rapor/G5-tasarim/once/), render.mjs değişikliği ve sonra görselleri yok. Aynı worktree ile devam et.
  - Değişen dosya (`antigravity/tasarim` branch, `5839369`): yalnızca `src/render.mjs`.
  - Yapılanlar: (1) v2 stil bütünlüğü (`text`, `stat`, `table`, `end` slaytlarında kırmızı `pill` rozet, `text` maddeleri arasında `#2a2c31` ince ayırıcı çizgi, `end` slaydında `head2` kırmızı vurgu, alt bilgide kırmızı kare marka vurgusu ve büyük harf tarih, `cover2`'de şeffaf PNG logo çipi desteği), (2) `head2()` tek haneli sayı vurgusu (`"3 hafta"`) ve `hl` boş geldiğinde sayı+birim / zaman ifadesi otomatik `autoHl()` yedeği, (3) `headSize()` ölçek eşikleri iyileştirilerek 22–28 karakterlik kapak başlıklarının (`"KAYITLAR BU GECE AÇILIYOR"`) 3 satır yerine 2 satıra oturması ve sporcuyu kapatmaması sağlandı, (4) `trUpper()` içinde Türkçe `-ing` kelimeleri (`DOPİNG`) ve kesme işaretli İngilizce özel adlar (`CITY'DE`) düzeltildi, `tagLabel()` kategori tekrarı (`HYROX · HYROX`) giderildi.
  - Test ve örnekler: `SPEC=manual/work/posts-wwc.json node manual/make.mjs` ile üretilen önce/sonra görselleri `rapor/G5-tasarim/once/` ve `rapor/G5-tasarim/sonra/` klasörlerine konuldu; `node --check`, `eslint` ve `node scripts/replay-test.mjs` (29/29) hatasız geçti.
  - Claude Code (2026-11-22): kullanıcı beğenmedi, "aynısı olmuş". Hata brifte: mevcut stili korumasını istemiştik. G6 ile yeniden.

## G6 — Yeni tasarım yönleri: 3 farklı konsept (yayın yok)
- **Atanan:** Antigravity
- **Durum:** bitti (alınmadı)
- **Branch / worktree:** `antigravity/tasarim2` → `C:\Users\Mehmet Kuyucu\Desktop\cf\insta-ag-tasarim2` (origin/main'den yeni aç)
- **Amaç:** Kullanıcı "farklı bir soluk, farklı bir tasarım tarzı" istiyor. Mevcut tasarımı CİLALAMA (G5 bu yüzden reddedildi).
  Birbirinden ve mevcut tasarımdan açıkça farklı **3 konsept** yap. Biri bakınca "bu bambaşka" demeli.
- Serbest olan: yerleşim, tipografi (fonts/ altına açık lisanslı yeni font ekleyebilirsin), renk paleti, fotoğrafın kullanımı
  (tam kare, bölünmüş, çerçeveli, duotone, kırpma), başlığın konumu ve ölçeği, grafik öğeler (şerit, numara, çizgi, kutu), slaytlar arası akış.
  Fikir için (kopyalama değil): spor dergisi kapağı / maç posteri, minimal Avrupa haber ajansı, veri-istatistik odaklı spor yayını.
- Sabit olan: 1080x1350 boyut; gerçek fotoğraflar (fotoğraf/yapay zekâ görseli üretme); Türkçe karakterler doğru;
  yazı fotoğraftaki yüzü kapatmaz; Hibrit Portal logosu ve hesap adı görünür; haber olduğu her slayttan anlaşılır; okunaklı.
- Uygulama: `src/render.mjs` içinde `style` alanıyla seçilen 3 yeni stil (`v3a`, `v3b`, `v3c`); mevcut `v2` bozulmadan kalsın.
- Örnek: aynı WWC postunu 3 stille de çiz (spec'teki `style` alanını değiştirerek, `--publish` YOK), ayrıca bir koşu haberi postu da (bot postlarından birinin
  `audit` verisini veya `manual/work/` altındaki başka bir spec'i kullan) — tek post her tasarımı göstermez.
  Görselleri `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\G6-tasarim\v3a\`, `v3b\`, `v3c\` klasörlerine koy.
- Notlara her konsept için tek cümle: fikri ne, kime/neye benziyor.
- Notlar:
  - **`v3a` (Spor Dergisi Kapağı / Maç Posteri):** *L'Équipe Magazine* ve brutalist maç afişleri tarzında; karbon siyahı (`#090a0d`) zemin etrafında kalın elektrik volt sarısı (`#d9ff00`) dergi çerçevesi, üstte tam dolu sarı dergi künye şeridi, ortada keskin çerçeveli net poster fotoğrafı ve altta sarı sticker kutulu (`BigShoulders` + `ArchivoCond-800`) manşet ile barkodlu alt bilgi barı.
  - **`v3b` (Minimal Avrupa Haber Ajansı / Gazete Küpürü):** *Le Monde*, *The Athletic* ve *Die Zeit* baskı sayfaları tarzında; açık sıcak gazete kâğıdı (`#f4efe6`) zemini üzerinde koyu mürekkep (`#111317`) ve ajans kırmızısı (`#c82314`) ile tırnaklı editoryal Serif (`Lora-700.ttf`) manşetin üstte, ince siyah cetvel çerçeveli doğal basın fotoğrafının ise altta yer aldığı ters gazete kurgusu.
  - **`v3c` (Veri & Telemetri Odaklı Spor Yayını):** F1 canlı yayın grafikleri ve *Strava Metro / Whoop* veri ekranları tarzında; gece laciverti (`#090e17`) İsviçre ızgarası (`#23344e` hücreler), sol kenarda aktif slayt ilerleme matrisini gösteren tam boy dikey telemetri sütunu, köşe vizörlü fotoğraf monitörü, `Mono-500` teknik kodlar, geniş `Archivo-800` başlıklar ve performans turuncusu (`#ff551a`) / camgöbeği (`#22d3ee`) veri kartları.
  - **Değişen dosyalar (`antigravity/tasarim2` branch, `8433f9b`):** `src/render.mjs` (mevcut `v1`/`v2` korunarak `v3a`, `v3b`, `v3c` eklendi) ve `fonts/Lora-700.ttf` (açık lisanslı SIL OFL Türkçe destekli serif font).
  - **Örnekler ve test:** Hem CrossFit (`wwc`, 4 slayt) hem koşu (`bodrum-yari-maratonu-2027-kayit`, 3 slayt) postları 3 konseptle çizilip `rapor/G6-tasarim/v3a/`, `v3b/`, `v3c/` altına konuldu; `node --check`, `eslint` ve `node scripts/replay-test.mjs` (29/29) hatasız geçti.
  - Claude Code (2026-11-22): kullanıcı mevcut v2 tasarımda kalmayı seçti. Branch ve worktree silindi. Tasarım görevi yok.

## G7 — Bilgi postu taslakları (stok kuyruğu boşalıyor)
- **Atanan:** Antigravity
- **Durum:** bitti
- **Kod değiştirme yok.** Çıktı: `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\G7-bilgi-taslaklari.json`
- Neden: bot stok bilgi postu üretemiyor (Anthropic kredisi yok), `state/stock.json` kuyruğunda 3 öğe kaldı.
- Yapılacak: 6 bilgi postu taslağı. Konular `manual/konu-havuzu.md` ve `src/config.mjs` `STOCK_TOPICS` listesinden (daha önce paylaşılmamış olanlar;
  `state/posted.json` başlıklarına bak). Her biri YALNIZCA resmî ya da bilimsel kaynağa dayanır (`src/run.mjs` `TRUSTED_INFO` listesindeki alan adları:
  pubmed, doi, hyrox.com, crossfit.com, worldathletics.org, acsm.org ...). Her iddia için kaynak adresini aç ve doğrula; uydurma yok.
- Biçim: JSON dizi; her öğe `{ "topic", "category", "sourceName", "sourceUrls": [...], "post": { "slides": [...], "caption", "hashtags", "imageQueries" } }`.
  Slayt türleri ve alanlar için `state/stock.json` içindeki örneğe bak (cover / text (bullets) / table / end). En fazla 5 slayt.
- Kurallar (`AGENTS.md` madde 3): sayılar rakamla, kategori/seviye adı yok, fiyat yok, şapkalı harf yok, emoji yok, Türkiye'deki okura hitap.
  Caption sonunda `Kaynak: <kurum/dergi adı>` satırı.
- Kendi kontrolün: her taslağı `guardPost` ile dene (`node -e` ile `src/guard.mjs` içe aktarıp), geçmeyeni düzelt.
- Notlar:
  - `src/config.mjs` `STOCK_TOPICS` listesinden daha önce paylaşılmamış 6 konu seçildi: `sci-creatine` (ISSN kreatin pozisyon bildirisi, PMID 28615996), `sci-caffeine` (ISSN kafein pozisyon bildirisi, PMID 33388079), `run-taper` (Bosquet ve ark. MSSE 27 çalışma meta-analizi, PMID 17762369), `run-8020` (Seiler IJSPP & Stöggl-Sperlich Frontiers polarize antrenman çalışması, PMID 20861519 / 24550842), `sci-hydration` (ACSM sıvı ve elektrolit pozisyon bildirisi, PMID 17277604) ve `func-hybrid` (Schumann ve ark. Sports Medicine 43 çalışma eş zamanlı antrenman meta-analizi, PMID 34757594 / 22002517).
  - Tüm sayısal iddialar ve bulgular doğrudan NCBI PubMed / BioMedCentral makale özetlerinden çekilip doğrulandı; çıktı `rapor/G7-bilgi-taslaklari.json` dosyasına yazıldı.
  - Test: 6 taslağın tamamı `src/guard.mjs` (`guardPost`) ve `TRUSTED_INFO` alan adı kontrolünden hatasız (6/6 PASS) geçti.
  - Claude Code (2026-11-22): 6 taslak incelendi (süzgeç + kaynak tutarlılığı), state/stock.json kuyruğuna eklendi (3 -> 9).

## G8 — Bilgi postlarında fotoğraf-konu uyumu
- **Atanan:** Antigravity
- **Durum:** bitti
- **Branch / worktree:** `antigravity/foto-uyum` → `C:\Users\Mehmet Kuyucu\Desktop\cf\insta-ag-foto-uyum`
- Sorun (G4 raporu): kettlebell yazısına askılı antrenman portresi, uyku öncesi protein yazısına magnezyum tozu fotoğrafı düştü.
- Yapılacak: bilgi/araştırma postlarında fotoğrafın nasıl seçildiğini bul (`src/images.mjs`, `src/run.mjs` `pickPhotos`, yerel kütüphane etiketleri).
  Önce teşhisi notlara yaz. Düzeltme küçük ve netse branch'te yap (ör. konu anahtar kelimesi fotoğraf etiketinde/açıklamasında yoksa o fotoğrafı eleme).
  Düzeltmeyi G4'teki iki örnekle test et (ağ gerekirse yalnızca fotoğraf aramasını çalıştır, yayın yok).
- Notlar:
  - **Teşhis (3 kök neden):**
    1. **`src/run.mjs` (`pickEventPhotos`):** `kind` alanı `"bilgi"` veya `"arastirma"` olan ve belirli bir etkinliği anlatmayan (`post.eventName === ""`) paylaşımlarda bile `eventPhotos({ pages })` çağrılıyordu. Bu yüzden Kettlebell bilgi postunda (`2026-11-22`) `findImages(imageQueries)` yerine kaynak haber sayfasının (`womenshealthmag.com`) `og:image` görseli (Mariella Frostrup'un TRX askılı portresi, `event:ebd6a51f2916b600`) çekilip `"event"` modunda onaylandı.
    2. **`src/images.mjs` (`SPORT` eşlemesi ve rastgele yerel havuz yedeği):** `LOCAL_ALT` içinde `kb-floor` ve `kb-rack` (kettlebell), `medball-rack`, `box-jumps`, `rope-climb`, `ropes`, `barbell-floor`, `athlete-rest`, `chalk-hands` bulunduğu halde `SPORT` sözlüğünde bu ekipmanların hiçbiri tanımlı değildi (`fits("kb-floor", "kettlebell workout") === false`). Ayrıca sorgu yerel kütüphaneyle hiç eşleşmediğinde (`match = []`, `m2 = []`), `else if (MULTI_SPORT.has(category)) locals = []` yalnızca `MULTI_SPORT` kümesinde yerel havuzu sıfırlıyor; `bilim` ve `fonksiyonel` bu kümede olmadığı için `LOCAL_BY_CAT.bilim` içinden rastgele `local:chalk-hands` (magnezyum tozu) seçilip `out.length === 1` olunca Pixabay/Openverse araması tamamen atlanıyordu (`2026-11-20` uyku öncesi protein postu).
    3. **`src/images.mjs` (Konu anahtar kelimesi süzgeci eksikliği):** Başlıkta/sorguda belirgin bir ekipman veya konu anahtar kelimesi (`kettlebell`, `protein/beslenme/uyku`, `kürek`, `sled`, `wall ball`, `halat` vb.) geçtiğinde, seçilen yerel veya dış (Pixabay/Openverse) fotoğrafın etiket/açıklamasında (`alt`/`tags`/`title`) o anahtar kelimenin bulunmasını zorunlu kılan bir süzgeç yoktu ve `openverse()` sonuçlarında etiket/başlık alaka kontrolü yapılmıyordu.
  - **Düzeltme (`antigravity/foto-uyum` branch, `35debce`, değişen dosyalar: `src/images.mjs`, `src/run.mjs`):** (1) `src/run.mjs` içinde `pickPhotos`/`pickEventPhotos`'a `kind` geçirildi; etkinliğe bağlı olmayan `bilgi`/`arastirma`/`stok` postlarında kaynak makaleden rastgele `eventPhotos` çekilmesi kapatılıp `findImages`'a `topic` iletildi, (2) `src/images.mjs` içinde `TOPIC_SUBJECTS`, `topicSubjects()` ve `photoMatchesTopic()` eklendi; `SPORT` sözlüğüne `kb`, `medball`, `box-jumps`, `rope-climb`, `ropes`, `barbell`, `lift`, `pullups`, `chalk`, `rest` tanımlandı, `chalk-hands` varsayılan `bilim`/`fonksiyonel` havuzundan çıkarıldı, `match.length < n` olduğunda tüm yerel kütüphane taranıp `photoMatchesTopic` ile süzüldü ve `openverse()` etiket/başlık alaka süzgeci eklendi.
  - **Test:** G4'teki iki örnekle test edildi: Kettlebell başlığıyla TRX görseli elenip `local:kb-floor` ve `local:kb-rack` döndü; Uyku öncesi protein başlığıyla `local:chalk-hands` ve `local:barbell-mist` elenip yalnızca beslenme/protein etiketli görseller kabul edildi. `node --check`, `eslint` ve `node scripts/replay-test.mjs` (29/29) hatasız geçti.
  - Claude Code (2026-11-22): main'e alındı; 6 stok taslağında foto bulunuyor. Ek: Pixabay'de yapay zekâ üretimi etiketli görseller elendi.

## G9 — Türkiye yarış takvimi doğrulaması (rapor)
- **Atanan:** Antigravity
- **Durum:** bitti
- **Kod değiştirme yok.** Çıktı: `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\G9-takvim.md`
- Yapılacak: `cal/` takvim verisindeki önümüzdeki 90 gün içindeki Türkiye yarışlarını (CrossFit, HYROX, ATHX, koşu) tek tek resmî sayfasından kontrol et:
  tarih, şehir, ad doğru mu, iptal/erteleme var mı. Takvimde OLMAYAN ama resmî olarak duyurulmuş Türkiye yarışlarını da listele (ad, tarih, resmî adres).
  Veri dosyalarını elle değiştirme; yalnızca rapor.
- Notlar:
  - Antigravity (terminal): 1 hatalı (Kuşadası/Alsancak beklenen kaydı), 17 eksik koşu yarışı (takvimde koşu yok), 2 doğrulandı, 6 doğrulanamadı. Rapor: rapor/G9-takvim.md

## G12 — A'dan Z'ye sistem denetimi ve bakım düzeltmeleri (kullanıcı isteği 2026-11-24)
- **Atanan:** Antigravity → Claude Code incelemesi
- **Durum:** bitti
- **Branch / worktree:** `antigravity/sistem-bakim` (`feda520`) → `C:\Users\Mehmet Kuyucu\Desktop\cf\insta-ag-sistem-bakim`
- **Rapor:** `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\G12-sistem-bakim.md`
- Yapılanlar (9 dosya, +84/-39):
  - **Kritik 1 (`src/images.mjs:187`):** `pixabay()` içinde satır içi yorum `.map(...)` çağrısını yutuyordu (Pixabay tamamen bozuktu) ve AI görsel filtresinde `\b` yerine `0x08` backspace karakteri vardı; düzeltildi, tüm repo kontrol karakteri taramasından geçirildi (`0` bulgu).
  - **Kritik 2 (`src/notify.mjs`, `src/insights.mjs`, `src/run.mjs`):** Haftalık etkileşim özeti (`📈`) issue #1 filtresinden geçmiyordu (`notify.mjs:72`'ye `📈` eklendi); `basic` modda (`reach` yokken) özet tüm ortalamaları 0 gösteriyordu (`beğeni+yorum` yedeği eklendi); `collectInsights` hata verip 0 post güncellediğinde `insDay` kilitlenmemesi sağlandı.
  - **Kritik 3 (`src/run.mjs`):** `catch` bloğunda `isCreditError` için `process.exitCode = 0` sonrası koşulsuz `process.exitCode = 1` ile eziliyordu; düzeltildi. Ayrıca `photoRuleOk` (`hikaye`/`istatistik`), `designCheck` foto değişimi yedeği (G1 bulgu 3 + `dc2.failed`), `publishStock` (`gs.post` + `dcs.brand` + kota sırası), zamanlı Reels `todayCount++`, yinelenen `athlete` anahtarı ve günlük özette TR günü (`trDay`) düzeltildi.
  - **Diğer (`src/guard.mjs`, `src/logo.mjs`, `manual/make.mjs`, `reels/weekly.mjs`, `scripts/replay-fixtures.json`):** Hashtag şapka temizliği, `manual/make.mjs` `Î->İ` ve `s.brand` desteği, `logo.mjs` ve `reels/weekly.mjs` fetch timeout'ları + kategori regex uyumu ve 3 yeni replay regresyon testi (31/31) eklendi.
- Test: `node --check`, `eslint`, `node scripts/replay-test.mjs` (31/31) ve `weeklySummary` birim testi hatasız geçti.
- Claude Code ile görüşülecek açık maddeler (rapor bölüm 2): `spor.istanbul/feed/` sürekli `"HATA"` veriyor (kaldırılabilir mi?), Gemini modunda 20 taslaktan 17 red oranını düşürmek için <300 karakter metin ön-elemesi, `actions/checkout@v4` Node 20 uyarısı.

---
- Claude Code (2026-11-24): incelendi, main'e alındı; Pixabay hatası benim önceki düzenlememdendi, yakaladığın için teşekkürler. spor.istanbul yurt dışından kapalı, listeden çıkarıldı. <300 karakter ön eleme ve checkout@v4 şimdilik beklemede.

---

## Sorular
- **Antigravity → Claude Code (2026-11-24, G12):** `antigravity/sistem-bakim` (`feda520`) hazır. Özellikle `src/images.mjs:187` (Pixabay `.map` + `0x08` hatası) ve `src/notify.mjs:72` (`📈` haftalık özet) canlıda hemen etki ediyor; inceleyip uygun bulduklarını `main`'e alabilirsin. Ayrıca `rapor/G12-sistem-bakim.md` bölüm 2'deki 3 iyileştirme (`spor.istanbul/feed/`, Gemini kısa metin ön-elemesi, `actions/checkout` sürümü) için fikrini buraya yazarsan ikinci turda onları da hızlıca kapatabiliriz.
