# G12 — A'dan Z'ye Sistem Denetimi ve Düzeltme Raporu

**Tarih:** 2026-11-24  
**Hazırlayan:** Antigravity (inceleme & main'e alma: Claude Code)  
**Branch / Worktree:** `antigravity/sistem-bakim` (`C:\Users\Mehmet Kuyucu\Desktop\cf\insta-ag-sistem-bakim`, base `46442ef`)

---

## 1. Kritik Hatalar (Branch'te Düzeltildi)

1. **`src/images.mjs:187` — Pixabay araması tamamen bozuktu (Yüksek)**
   - **Sorun:** Satır içi yorum `// kullanıcı kuralı: yapay zekâ görseli yok.map(...)` şeklinde tek satıra yapışmıştı; `.map(...)` çağrısı yorum satırının içinde kalarak hiç çalışmıyordu. Sonuç olarak `pixabay()` ham Pixabay JSON nesnelerini (`{ id, largeImageURL, tags }`, `url` alanı `undefined`) döndürüyordu ve `download(c.url)` her seferinde `null` dönerek Pixabay'dan sıfır fotoğraf gelmesine neden oluyordu.
   - **Ek sorun:** Aynı satırdaki regex'te `\b` yerine kontrol karakteri `0x08` (ASCII backspace) gömülüydü (`!/\x08(ai...)\x08/i`), bu nedenle yapay zekâ üretimi görsel filtresi de hiç eşleşmiyordu.
   - **Düzeltme:** Yorum ayrı satıra alındı, `.map(...)` yeniden aktif edildi ve `0x08` kontrol karakterleri gerçek `\b` kelime sınırına çevrildi. Tüm repo (`src/`, `scripts/`, `reels/`, `manual/`, `cal/scripts/`) kontrol karakterlerine karşı tarandı; başka dosya yok (`0` kaldı).

2. **`src/notify.mjs:72` + `src/insights.mjs:33-51` — Haftalık etkileşim özeti issue #1'e gitmiyordu ve `basic` modda sıfır basıyordu (Yüksek)**
   - **Sorun 1:** `weeklySummary()` çıktısı `📈` emojisiyle başlıyor (`src/insights.mjs:46`), ancak `src/notify.mjs:72`'deki GitHub issue filtresi yalnızca `/^(⚠️|📊|🎬)/u` ile başlayan mesajları issue #1'e yazıyor. Bu yüzden Pazar akşamı üretilen haftalık etkileşim özeti issue #1'e hiç düşmeyecekti.
   - **Sorun 2:** `instagram_manage_insights` izni yoksa `mediaInsights()` `{ likes, comments, basic: true }` döndürüyor (`reach` yok). Buna rağmen `weeklySummary()` her zaman `p.ins.reach ?? 0` kullandığı için `Türe göre ortalama erişim: haber: 0` şeklinde tamamen sıfır raporlayacaktı.
   - **Sorun 3 (`src/run.mjs:243`):** `collectInsights()` geçici bir ağ/rate-limit hatasında `r.n === 0 && r.err` dönse bile `state.insDay = today` işaretleniyordu; o gün bir daha denenmiyordu.
   - **Düzeltme:** `notify.mjs:72` regex'ine `📈` eklendi; `insights.mjs` `reach` yoksa `ortalama beğeni+yorum` yedeğine geçecek ve `trHour` `% 24` ile güvenli olacak şekilde güncellendi; `run.mjs:243` yalnızca `r.n > 0 || !r.err` ise `insDay` işaretliyor.

3. **`src/run.mjs:1299` — Anthropic kredi bitişinde `process.exitCode = 1` ile sahte kırmızı alarm (Yüksek)**
   - **Sorun:** `catch (e)` bloğunda `isCreditError(e)` yakalandığında `process.exitCode = 0` atanıyor, ancak hemen `if/else` bloğunun dışındaki `process.exitCode = 1;` satırı bunu her koşulda `1` ile eziyordu. Kredi yokken (ve Gemini anahtarı yoksa) GitHub Actions her saat başarısız görünüp e-posta alarmı atacaktı.
   - **Düzeltme:** `process.exitCode = 1;` yalnızca `else` dalına alındı.

4. **`src/run.mjs:773-791` & `691` — Tasarım denetimi (`designCheck`) fotoğraf değişimi ve olay görseli kuralı boşlukları (Orta-Yüksek)**
   - **Sorun 1:** `photoRuleOk` yalnızca `["haber", "duyuru", "takip"]` için stok yasağı uyguluyordu; `hikaye` ve `istatistik` eksikti (G1 Bulgu 2).
   - **Sorun 2:** `designCheck` `foto_degistir` dediğinde `ownOnly` kontrolü `kind` ve `p.person` bayrağını içermiyordu; ayrıca `keep.length + fresh.length === 0` olduğunda kusurlu fotoğraf olduğu gibi yeniden çizilip yayınlanabiliyordu (G1 Bulgu 3) ve ikinci `designCheck` (`dc2`) `failed: true` döndürdüğünde hata mesajı boş kalıyordu.
   - **Düzeltme:** `photoRuleOk` listesine `"hikaye"` ve `"istatistik"` eklendi; `ownOnly` güncellendi; `keep.length + fresh.length === 0` durumunda yayın durduruldu; yeni fotoğraf seçimi sonrası `photoRuleOk` tekrar doğrulandı ve `dc2.failed` açıkça işlendi.

5. **`src/run.mjs:1211-1240` — `publishStock()` içinde `guardPost` çıktısı atılıyor, `dcs.brand` kullanılmıyor ve kota kontrolü geç yapılıyor (Orta)**
   - **Sorun:** `gs = guardPost(...)` çağrılıyor ama sonraki satırda ham `item.post` kullanılıyordu (temizlenmiş metin/şapka/hashtag atlanıyordu). Ayrıca `designCheck`'in döndürdüğü `dcs.brand` kontrol edilmediği için marka görünen stok postunda `"Reklam / Tanıtım"` eklenmiyordu; bilgi kotası dolu olduğunda bile baştaki kuyruk öğeleri mutasyona uğruyordu.
   - **Düzeltme:** Kota kontrolü kuyruk döngüsünün önüne alındı, `post = gs.post` kullanıldı ve `dcs.brand` true ise `"Reklam / Tanıtım"` eklendi.

6. **`src/guard.mjs:102` + `manual/make.mjs:51` + `src/run.mjs:821, 1020, 1264` — Küçük kural/tutarlılık hataları (Orta)**
   - `guard.mjs:102`: Hashtag'lerde şapkalı harfler (`â, î, û`) temizlenmiyordu (`#resmîduyuru` geçiyordu) → `HAT` haritasıyla temizlik eklendi.
   - `manual/make.mjs:51`: `Î -> I` dönüşümü Türkçe `İ` yerine noktasız `I` veriyordu ve `s.brand === true` için `"Reklam / Tanıtım"` desteği yoktu → düzeltildi.
   - `src/run.mjs:821-823`: `state.posts.push(...)` nesnesinde `athlete` anahtarı iki kez tanımlanmıştı → teke indirildi.
   - `src/run.mjs:1020`: Zamanlı onaylanan Reels yayınında `todayCount++` atlanıyordu (anında onaylanan Reels'te artarken zamanlıda artmıyordu) → tutarlı hale getirildi.
   - `src/run.mjs:1264`: Günlük özette reddedilen taslaklar UTC tarihiyle filtreleniyordu → `trDay(r.at) === today` (TR günü) yapıldı.

7. **`src/logo.mjs:83` + `reels/weekly.mjs:75, 136, 172, 306, 404` — Zaman aşımı eksikliği ve kategori süzgeci uyumu (Orta)**
   - `logo.mjs` ve `reels/weekly.mjs` içindeki 5 `fetch` çağrısında `AbortSignal.timeout` yoktu; askıda kalan bir IG/ElevenLabs/GitHub isteği tüm GitHub Actions job'ını 45–60 dk kilitleyebilirdi → makul timeout'lar eklendi (`15–90 sn`).
   - `reels/weekly.mjs:136`: Kategori/fiyat regex'i `guard.mjs` ile uyumlu olacak şekilde genişletildi (`Open/Pro Women|Men`, `Age Group`, `£` vb.).

---

## 2. Claude Code ile Birlikte Karar Verilecek / İzlenecek Maddeler (Dokunulmadı)

Bu maddeler canlı işleyiş / tasarım tercihi veya repo dışı/gizli alanlarla ilgili olduğundan Claude Code incelemesine bırakıldı:

1. **Canlı akış gözlemi — `spor.istanbul/feed/` sürekli `"HATA"` dönüyor (`src/config.mjs:51`):**
   - Son GitHub Actions loglarında (`45240883062`, `45050762435`) `https://spor.istanbul/feed/` her çalışmada `"HATA"` veriyor. Sitenin RSS ucu kapandıysa ya da engel koyduysa listeden kaldırılabilir (Google News'te `"Spor İstanbul"` sorgusu zaten mevcut).
2. **`state/posted.json` — `paused: { reason: "kredi" }` ve Gemini modu verimliliği:**
   - 2026-11-23 özetinde `20 taslak, 2 onay, 17 red` görülüyor; Gemini modunda web araması olmadığı için taslakların önemli kısmı doğrulamada eleniyor. `138d92c` ile eklenen gün içi taslak yayılımı (`%40 / %70 / %100`) bunu kısmen dengeleyecektir; 1–2 gün loglarını izleyip `state/rejected.json` içindeki en sık elenme nedenine göre Gemini moduna özel ön-eleme (ör. metni 300 karakterden kısa haberleri Gemini'de hiç yazmama) eklenebilir.
3. **`post.yml` — `git add` ve `Node 20` Actions uyarısı:**
   - GitHub Actions loglarında `actions/checkout@v4` için Node 20 deprecation uyarısı çıkıyor (`actions/checkout@v5` veya güncel majör sürüme geçiş değerlendirilebilir).
4. **Ana çalışma klasöründeki kirli dosyalar (`C:\Users\Mehmet Kuyucu\Desktop\cf\insta`):**
   - `src/container-test.mjs` üzerinde commitlenmemiş değişiklik ve `reels/anlatim-pekin/`, `reels/bulut-test/`, `reels-konulari.md`, `rapor/G6-tasarim/` izlenmeyen dosyaları bulunuyor. Antigravity kural gereği ana klasöre dokunmadı.

---

## 3. Doğrulama Sonuçları

- `node --check` (tüm `src/*.mjs`, `reels/weekly.mjs`, `manual/make.mjs`): **Hatasız geçti**
- `eslint -c scripts/eslint.config.mjs src/*.mjs reels/weekly.mjs manual/make.mjs`: **Hatasız geçti**
- `node scripts/replay-test.mjs`: **31/31 geçti** (3 yeni regresyon testi eklendi: şapkalı hashtag, `Brezilya/rezil`, `Pro kategorisinde`)
- `weeklySummary` birim testi (`basic` ve `reach` modları): **Geçti**
- Kontrol karakteri taraması (`0x00–0x1F` / `0x7F`): **0 bulgu**
