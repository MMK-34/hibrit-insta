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
- **Durum:** bekliyor
- **Kod değiştirme yok.** Çıktı: `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\G4-gorsel.md`
- Kullanıcıdan ekran görüntüsü İSTEME. Görseller: `state/posted.json` içindeki son 30 yayınlanmış postun (`media` alanı dolu)
  `cover` adresleri (`raw.githubusercontent.com/.../media/...` kapak görseli). Bu adresleri indirip bak; Instagram'a girme.
  Kapak dışındaki slaytlar aynı klasördedir (`cover` adresindeki `01.jpg` yerine `02.jpg`, `03.jpg`... dene; yoksa yalnızca kapak).
- Her post için kontrol et: foto konuyla ilgili mi, olay postunda yalnızca olayın kendi görseli mi, yazı taşıyor mu,
  logo/yüz kesiliyor mu, kırmızı vurgu doğru kelimede mi. Sorunlu olanları başlık + adres + sorun olarak listele; sorunsuzları tek satırda say.
- Notlar:

## G5 — Post slayt tasarımı denemesi (yayın yok)
- **Atanan:** Antigravity
- **Durum:** yapılıyor (Antigravity)
- **Branch / worktree:** `antigravity/tasarim` → `C:\Users\Mehmet Kuyucu\Desktop\cf\insta-ag-tasarim`
- Yapılacak: post slaytlarının tasarımını iyileştir (`src/render.mjs`, gerekirse `fonts/`). Fotoğraf ÜRETME, yapay zekâ görseli
  YOK; mevcut gerçek fotoğraflar kalır. Hedef: v2 haber sitesi stili, kırmızı vurgu (`hl`), Türkçe karakterler doğru,
  yazı taşmaz, logo/yüz kesilmez, boyut aynı kalır.
- Önce/sonra örnek: `SPEC=manual/work/posts-wwc.json node manual/make.mjs` (`--publish` YOK). Önce/sonra görselleri
  `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\G5-tasarim\once\` ve `...\sonra\` klasörlerine koy.
- Notlar:

---

## Sorular
(Ajanlar buraya yazar, kullanıcı/Claude Code cevaplar.)
