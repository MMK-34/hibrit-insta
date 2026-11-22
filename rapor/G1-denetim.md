# G1 — Bağımsız Sistem Denetimi Raporu

**Tarih:** 2026-11-22  
**Denetlenen Dosyalar:** `src/run.mjs`, `src/guard.mjs`, `src/plan.mjs`, `src/event-photos.mjs`, `manual/make.mjs`, `.github/workflows/post.yml`  
**Referans:** `AGENTS.md` (Madde 3 — İçerik Kuralları)

---

## 1. Kural Bazlı Uyum Özeti

| Kural (`AGENTS.md` Madde 3) | Kodda Karşılığı | Durum |
|---|---|---|
| **Görsel kuralı:** Belirli olay/yarışta yalnızca kendi görseli (geçmiş yıllar dahil); stok yalnızca bilgi postlarında | `src/run.mjs:656-686` (`photoRuleOk`, `pickEventPhotos`), `src/event-photos.mjs:98-123` | **Kısmi açık var** (`hikaye`, `seri`, `istatistik` ve tasarım denetimi yedeği) |
| **Kişi adı ve yüzü:** Doğru/kaynaklı olmalı; kişi adı geçen video/seriler kullanıcı onayına gider | `src/event-photos.mjs:134-204` (`personPhotos`), `src/run.mjs:794-808`, `src/run.mjs:906-963` | **Kısmi açık var** (`publishSeries` doğrudan yayın yapıyor) |
| **Günlük 10 post sınırı & yayın penceresi (07:00–22:30 TR)** | `src/config.mjs:12`, `src/run.mjs:156-157, 230, 237`, `manual/make.mjs:17-18` | **Kısmi açık var** (`todayCount` çalışma içinde güncellenmiyor; `repost`/`stock` pencere sonrası tetiklenebiliyor) |
| **Günde en fazla 1 bilgi postu (yalnızca resmi/bilimsel kaynak)** | `src/config.mjs:23`, `src/run.mjs:158, 337, 456-459, 517-520, 1154` | **Kısmi açık var** (`publishStock` sonrası `infoToday` artmıyor ve `infoSourceOk` kontrolü yok; `STOCK_TOPICS` içinde kategori adları var) |
| **Günde en fazla 2 story** | `src/config.mjs:34`, `src/run.mjs:186, 700-701, 816, 869` | **Kısmi açık var** (`countdownToday` UTC günüyle karşılaştırıyor) |
| **Koşu yarışları:** Yarış başına tek kısa post (en fazla 3 slayt) | `src/run.mjs:369, 413-427, 509-512, 1098`, `src/plan.mjs:383-384` | **Kısmi açık var** (`manual/make.mjs` içinde 3 slayt sınırı yok) |
| **Kategori/seviye/divizyon adı yazılmaz** | `src/run.mjs:406-407`, `src/guard.mjs:78-82` | **Kısmi açık var** (`Open`, `Pro`, `Age Group`, `Yaş Grubu`, `Bireysel`, `Takım` yakalanmıyor) |
| **Fiyat yazılmaz** | `src/guard.mjs:87-88` | **Kısmi açık var** (`£`, `GBP`, `CHF`, `ücretli/ücretsiz`, `fiyatı`, `bedeli` yakalanmıyor) |
| **Şapkalı harf (â, î, û) yok** | `src/guard.mjs:31-32, 105`, `src/run.mjs:755` | **Kısmi açık var** (`manual/make.mjs:49` kredi satırında ve `guard.mjs:99` hashtag'lerde şapka temizlenmiyor) |
| **Sayılar rakamla ("bir" hariç)** | `src/guard.mjs:84-85` | **Kısmi açık var** (`on`, `yüz`, `bin`, `milyon` yazıyla yazılırsa yakalanmıyor) |
| **Marka görünüyorsa caption'da "Reklam / Tanıtım"** | `src/run.mjs:727, 760` | **Kısmi açık var** (`manual/make.mjs` ve `publishStock` akışında `designCheck` / marka kontrolü yok) |
| **Türkiye testi** | `src/plan.mjs:272`, `src/run.mjs:452, 461-475` | Uygulamada (`EDITOR` istemi + `offAudience` filtresi) |
| **Tasarım: v2 haber sitesi stili, kapakta `hl` ile en fazla 3 kelime** | `src/guard.mjs:57-61`, `manual/make.mjs:25-27` | **Açık var** (`manual/make.mjs` `guardPost`'un temizlediği `hl`'yi ham spec'ten geri yazıyor) |

---

## 2. Bulgular

### Bulgu 1 — `todayCount` çalışma içinde artırılmadığı için tek çalışmada günlük 10 post sınırı aşılabiliyor
- **Dosya:Satır:** `src/run.mjs:79-80`, `src/run.mjs:265`, `src/run.mjs:271`, `src/run.mjs:377`, `src/run.mjs:953`, `src/run.mjs:971`, `src/run.mjs:993`
- **Önem:** Yüksek
- **Sorun:** `todayCount` çalışma başında `state.posts`'tan hesaplanıyor (`satır 80`) ve yalnızca `publishManualQueue` içinde (`satır 181`) artırılıyor. Aynı çalışmada `processApprovals` (onaylı post/Reels), `publishDmTip` (DM ihbarı), `publishSeries` (seri postu) ve ana haber döngüsü (`renderAndPublish`) paylaşım yaptığında `todayCount` güncellenmiyor; yalnızca `publishedCount` (`publishDmTip`, `publishSeries`, ana döngü) artırılıyor.
- **Somut Örnek Senaryo:** Gün içinde 9 post paylaşılmış olsun (`todayCount = 9`). Saat 14:30 çalışmasında:
  1. `processApprovals()` onaylanmış 1 istatistik postu ve 1 zamanlı post paylaşır (`todayCount` hâlâ 9, `publishedCount` 0).
  2. `publishDmTip()` çalışır: `todayCount >= MAX_PER_DAY` (`9 >= 10`) yanlış olduğu için 1 DM postu paylaşır (`publishedCount = 1`).
  3. `publishSeries()` çalışır: `todayCount < MAX_PER_DAY` (`9 < 10`) doğru olduğu için 1 seri postu paylaşır (`publishedCount = 2`).
  Böylece aynı gün toplam 13 post paylaşılarak günlük en fazla 10 post kuralı aşılır.
- **Önerilen Düzeltme:** `state.posts.push({ ..., media: res.id, ... })` yapılan her başarılı yayından sonra (veya `todayCount`'u sabit değişken yerine `const todayCount = () => state.posts.filter((p) => p.day === today && p.media).length;` fonksiyonu yaparak) günlük sayaç canlı tutulmalı; her yayın adımı öncesinde `if (todayCount() >= MAX_PER_DAY)` kontrolü yapılmalıdır.

---

### Bulgu 2 — `hikaye`, `seri` ve `istatistik` postlarında olay/yarış görseli yerine stok fotoğraf kullanılabiliyor
- **Dosya:Satır:** `src/run.mjs:588`, `src/run.mjs:656-664`, `src/run.mjs:674-685`
- **Önem:** Yüksek
- **Sorun:** `AGENTS.md` madde 3'e göre: *"Belirli bir olay/yarış anlatılıyorsa YALNIZCA o olayın kendi fotoğraf/videosu kullanılır. Stok görsel yalnızca olaya bağlı olmayan bilgi postlarında..."* Ancak:
  1. `photoRuleOk` (`src/run.mjs:661`) yalnızca `["haber", "duyuru", "takip"]` türlerinde `specific || person` zorunluluğu koşuyor. Tür `hikaye` veya `istatistik` olduğunda, yazar `eventName` veya `athleteName` alanını boş bırakırsa `pickEventPhotos` (`satır 682`) stok fotoğrafa düşüyor ve `photoRuleOk` bunu engellemiyor.
  2. `publishSeries` (`src/run.mjs:588`) belirli yarışları ve sporcuları anlatan serilerde bile hiç `pickPhotos` / `photoRuleOk` çağırmadan doğrudan `findImages(...)` ile stok fotoğraf çekip yayınlıyor.
- **Somut Örnek Senaryo:** Bir yarışta amatör bir sporcunun yaşadığı gerçek olay `kind: "hikaye"` olarak seçildiğinde ve model `eventName: ""` döndürdüğünde, `pickEventPhotos` Pexels/Openverse'ten stok koşucu fotoğrafı alıyor; `photoRuleOk` içinde `kind === "hikaye"` kontrolü olmadığı için belirli bir olayı anlatan hikâye postu stok fotoğrafla yayınlanıyor.
- **Önerilen Düzeltme:** `photoRuleOk` içindeki `["haber", "duyuru", "takip"]` listesine `"hikaye"` ve `"istatistik"` eklenmeli (`["haber", "duyuru", "takip", "hikaye", "istatistik"]`); `pickEventPhotos` içinde stok yedeği yalnızca `["bilgi", "arastirma"].includes(kind)` olduğunda çalışmalıdır.

---

### Bulgu 3 — Tasarım denetimi (`designCheck`) fotoğraf değiştirdiğinde olay postuna stok fotoğraf sızabiliyor
- **Dosya:Satır:** `src/run.mjs:704`, `src/run.mjs:731-739`
- **Önem:** Orta
- **Sorun:** `renderAndPublish` başında `photoRuleOk` (`satır 704`) bir kez çalıştırılıyor. Ardından `designCheck` (`satır 726`) bir slayttaki fotoğraf için `foto_degistir` derse (`satır 731-738`), `ownOnly` kontrolü `post.athleteName || post.eventName || photos.some((p) => p.specific)` olarak yapılıyor. Tek fotoğraflı bir `haber` postunda (ör. `eventName` boş, tek fotoğraf `person: true, specific: false` veya tüm `specific` fotoğraflar `badIdx` içindeyse) ya da değişim sonrasında `photoRuleOk` yeniden çağrılmıyor. Ayrıca tüm fotoğraflar `badIdx`'e düşerse ve `ownOnly` yüzünden `fresh` boş dönerse `keep.length + fresh.length === 0` olduğundan eski hatalı `photos` dizisi olduğu gibi yeniden çizilip yayınlanabiliyor.
- **Somut Örnek Senaryo:** `eventName` alanı dolu olan tek fotoğraflı bir olay postunda `designCheck` 1. slayt için `foto_degistir` döndürür (`badIdx = {0}`). `keep` boş dizi `[]`, `ownOnly` true olduğu için `fresh` boş dizi `[]` olur. `if (keep.length + fresh.length)` (`0`) yanlış olduğu için `photos` hiç değişmez; ikinci `designCheck` tesadüfen geçerse kusurlu fotoğraf yayınlanır, ya da `ownOnly` false olan bir durumda stok fotoğraf eklendikten sonra `photoRuleOk` tekrar çalışmadığı için stok fotoğraflı haber yayınlanır.
- **Önerilen Düzeltme:** `ownOnly` koşuluna `["haber", "duyuru", "takip", "hikaye"].includes(kind)` eklenmeli, `keep.length + fresh.length === 0` ise `return null` ile yayın durdurulmalı ve fotoğraf değişiminden sonra `photoRuleOk(post, photos, kind)` tekrar kontrol edilmelidir.

---

### Bulgu 4 — Kişi adı geçen seriler kullanıcı onayına gitmeden doğrudan yayınlanıyor
- **Dosya:Satır:** `src/run.mjs:267-275`, `src/run.mjs:576-606`
- **Önem:** Yüksek
- **Sorun:** `AGENTS.md` madde 3'te *"Kişi adı geçen video/seriler kullanıcı onayına gider"* kuralı yer alıyor (`src/run.mjs:267` yorumunda da *"Tekrarlayan seriler (hafta sonu yarışları, Türk sporcuların haftası, aylık takvim)"* olarak geçiyor). Videolar (`reels`) `processApprovals` üzerinden kullanıcı onayına giderken, `publishSeries` (`src/run.mjs:594`) `hold: true` kullanmadan `renderAndPublish` ile doğrudan Instagram'da yayın yapıyor.
- **Somut Örnek Senaryo:** "Türk sporcuların haftası" veya sporcu adı içeren bir seri postu vadesi geldiğinde `publishSeries` tarafından üretilir ve `queueForApproval`'a uğramadan doğrudan yayınlanır.
- **Önerilen Düzeltme:** `publishSeries` içinde üretilen seri postunda kişi/sporcu adı geçiyorsa (veya ilgili serilerde `s.requireApproval` / `hold: true` ile) `renderAndPublish` çağrısına `hold: true` verilerek `queueForApproval` kuyruğuna alınmalıdır.

---

### Bulgu 5 — `manual/make.mjs` kapak vurgusunu (`hl`) süzgeçten (`guardPost`) sonra ezerek 3 kelime kuralını devre dışı bırakıyor
- **Dosya:Satır:** `manual/make.mjs:19`, `manual/make.mjs:25-27`, `src/guard.mjs:57-61`
- **Önem:** Orta
- **Sorun:** `guardPost` (`src/guard.mjs:57-61`) kapak slaytındaki `hl` alanını temizliyor, en fazla 3 kelimeyle sınırlıyor (`.slice(0, 3)`) ve kelimelerin başlıkta gerçekten geçip geçmediğini doğruluyor. Ancak `manual/make.mjs:27` satırında:
  `post.slides = post.slides.map((sl, i) => ({ ...sl, ...["hl", "stat", "statLabel"].reduce((o, k) => (s.post.slides[i]?.[k] && sl.type === "cover" ? { ...o, [k]: s.post.slides[i][k] } : o), {}) }));`
  ifadesiyle `g.post.slides` içindeki doğrulanmış `hl` alanı, ham `s.post.slides[i].hl` değeriyle üzerine yazılarak eziliyor.
- **Somut Örnek Senaryo:** `manual/work/posts.json` içinde kapak slaytına 5 kelimelik veya şapkalı harf içeren ya da başlıkta hiç geçmeyen bir `hl: "Kayıtlar Hâlâ Devam Ediyor Kaçırmayın"` yazılırsa, `guardPost` bunu 3 kelimeye indirip şapkasını temizlese bile `manual/make.mjs:27` ham 5 kelimelik şapkalı metni geri yükler.
- **Önerilen Düzeltme:** `guardPost` zaten `o.hl`'yi koruyup döndürdüğü için `manual/make.mjs:27` içindeki `["hl", "stat", "statLabel"]` listesinden `"hl"` çıkarılmalıdır (yalnızca `guardPost`'un sildiği `"stat"` ve `"statLabel"` geri eklenmelidir).

---

### Bulgu 6 — `manual/make.mjs` içinde şapkalı harf, marka ("Reklam / Tanıtım") ve koşu 3 slayt kuralı uygulanmıyor
- **Dosya:Satır:** `manual/make.mjs:19-50`
- **Önem:** Orta
- **Sorun:**
  1. **Koşu 3 slayt sınırı:** `src/run.mjs:509-512` koşu postlarını (`ONE_POST_CATS`) en fazla 3 slayta indirirken, `manual/make.mjs`'de bu kontrol yok; 6 slaytlı bir koşu postu spec'e yazılırsa 6 slayt olarak sıraya giriyor.
  2. **Kredi satırında şapkalı harf:** `manual/make.mjs:49` satırında `Görsel: ${[...new Set(s.photos.map((p) => p.credit))].join(", ")}` doğrudan `post.caption`'a (`guardPost` sonrasında) ekleniyor. `p.credit` içinde `"circle21 resmî kayıt"` gibi şapkalı harf veya alan adı varsa temizlenmeden caption'a giriyor (`src/run.mjs:755`'teki `credit()` temizliği burada yok).
  3. **Marka / Reklam kontrolü:** `manual/make.mjs` `designCheck` çalıştırmadığı ve spec'te `brandSeen` alanı kontrol etmediği için görselde marka varsa `"Reklam / Tanıtım"` ibaresi eklenmiyor.
- **Somut Örnek Senaryo:** Elle hazırlanan bir koşu postuna 5 slayt ve `credit: "Resmî organizatör arşivi"` verildiğinde, post 5 slayt olarak ve caption'da `"Görsel: Resmî organizatör arşivi"` (şapkalı `î` ile) yayınlanır.
- **Önerilen Düzeltme:** `manual/make.mjs` içinde `ONE_POST_CATS` için `slides.length > 3` kontrolü eklenmeli, `p.credit` değerleri şapka/URL temizliğinden geçirilmeli ve `s.brand === true` (veya `designCheck`) durumunda caption'a `"Reklam / Tanıtım"` eklenmelidir.

---

### Bulgu 7 — `guard.mjs` rakam kuralında 10, 100, 1000 ve birleşik sayı kelimeleri yakalanmıyor
- **Dosya:Satır:** `src/guard.mjs:84-85`
- **Önem:** Orta
- **Sorun:** `AGENTS.md` madde 3: *"Sayılar rakamla (2, 3, 10 — 'iki', 'üç' değil; 'bir' hariç)."* `guard.mjs:84` içindeki regex:
  `/(?<!\p{L})(iki|İki|üç|dört|beş|altı(?! suyu)|yedi|sekiz|dokuz|yirmi|otuz|kırk|elli|altmış|yetmiş|seksen|doksan)(?!\p{L})/iu`
  Bu ifadede `on` (`AGENTS.md`'de açıkça `10` örneği verilmiş), `yüz`, `bin`, `milyon` kelimeleri yer almıyor (`on` ve `yüz` Türkçe eşsesli kelimeler olduğu için bağlamsız eklenememiş, ancak `"on beş"`, `"on iki"`, `"iki yüz"`, `"üç bin"` veya `"on gün"`, `"on sporcu"`, `"yüz metre"`, `"bin koşucu"` gibi sayı bağlamları da yakalanmıyor).
- **Somut Örnek Senaryo:** Model `"Yarışta on sporcu podyuma çıktı"` veya `"Parkur yüz metre yüzme etabıyla başlıyor"` ya da `"Yaklaşık bin koşucu katıldı"` yazdığında `guardPost` bunu geçerli sayar.
- **Önerilen Düzeltme:** Eşsesli kelimeleri yanlış yakalamamak için `(on|yüz|bin)\s+(sporcu|koşucu|kişi|atlet|takım|ülke|gün|hafta|ay|yıl|saat|dakika|saniye|km|kilometre|metre|etap|istasyon|antrenman|yarış|madalya|kez|defa)` gibi birim/isim takip eden kalıplar veya `on\s+(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz)` kalıbı `numWord` regex'ine eklenmelidir.

---

### Bulgu 8 — `guard.mjs` kategori/seviye ve fiyat yasaklarında kapsama boşlukları var
- **Dosya:Satır:** `src/guard.mjs:78-82`, `src/guard.mjs:87-88`, `src/config.mjs:106-107`
- **Önem:** Orta
- **Sorun:**
  1. **Kategori adları:** HYROX ve CrossFit'te sık kullanılan `Pro` (`Pro Women`, `Pro Men`), `Open` (`HYROX Open`, `Open Women`, `Open Men`), `Age Group`, `Yaş Grubu` / `yaş grupları`, `Adaptive`, `Foundations`, `Quarterfinals`, `Semifinals` veya Türkçe `"kategorisinde"`, `"divizyonunda"`, `"bireysel ve çiftler kategorileri"` ifadeleri; yanında `Beginner/Scaled/RX` yoksa `guard.mjs:78-82`'den geçiyor. Üstelik `src/config.mjs:106-107`'deki `STOCK_TOPICS` briflerinde bile `"Rx/Scaled kategori seçimi"` ve `"kategori seçimi (Open, Pro, Doubles, Relay)"` yazıyor.
  2. **Fiyat ifadeleri:** `guard.mjs:87` yalnızca `TL|USD|EUR|euro|dolar|lira` ve `[₺$€]` arıyor. İngiltere/İsviçre yarışlarında `£`, `GBP`, `sterlin`, `CHF` veya `"fiyatı"`, `"katılım bedeli"`, `"kayıt bedeli"`, `"ücretsiz"`, `"ücretli"` ifadeleri yakalanmıyor.
- **Somut Örnek Senaryo:**
  - Model `"HYROX Open Women ve Pro Men yarışlarında sonuçlar açıklandı"` veya `"Yaş grubu sonuçları açıklandı"` yazdığında `guardPost` onay verir.
  - Model `"Kayıt bedeli 120 GBP olarak belirlendi"` yazdığında `guardPost` onay verir.
- **Önerilen Düzeltme:**
  - `guard.mjs:78-82`'ye `\b(Open|Pro)\s+(Women|Men|Doubles|Division)\b`, `\bAge\s+Groups?\b`, `yaş\s+gru(bu|pları)` ve `kategori(si|sinde|leri|lerinde|lerde)` kontrolleri eklenmeli; `src/config.mjs:106-107`'deki `STOCK_TOPICS` açıklamalarından kategori adları çıkarılmalıdır.
  - `guard.mjs:87`'deki fiyat regex'ine `GBP|CHF|sterlin|£|(kayıt|katılım|giriş)\s*(bedel|fiyat)|fiyatı(?!\p{L})` eklenmelidir.

---

### Bulgu 9 — `countdownToday()` UTC tarihini kullandığı için 00:00–03:00 TR veya gece yarısı geçişlerinde story kotası yanlış hesaplanabiliyor
- **Dosya:Satır:** `src/run.mjs:700-701`
- **Önem:** Düşük
- **Sorun:** `today` değişkeni Türkiye saatine (`Europe/Istanbul`, UTC+3) göre `"YYYY-MM-DD"` üretirken (`src/run.mjs:50-52`), `countdownToday` fonksiyonu (`src/run.mjs:700`):
  `const countdownToday = () => Object.values(state.countdowns ?? {}).filter((t) => String(t).slice(0, 10) === new Date().toISOString().slice(0, 10)).length;`
  ifadesiyle UTC gününü kontrol ediyor. Ayrıca `state.posts.filter((p) => p.day === today && p.story)` yalnızca o gün paylaşılan bir postun kendi story'sini sayıyor; ancak `countdowns` zaman damgaları UTC olarak kaydedildiği için TR saatiyle sabah 00:00–02:59 arasında (veya `t`'nin TR karşılığı farklı güne düştüğünde) `today` ile uyumsuzluk oluşabiliyor.
- **Somut Örnek Senaryo:** Bir geri sayım hikâyesi veya test çalışması TR saatiyle 01:00'de (UTC bir önceki gün 22:00) kaydedilmiş olsa, sabah 09:00 TR çalışmasında UTC günü değiştiği için `countdownToday()` 0 döner ve aynı TR gününde 2 normal story + 1 geri sayım story = 3 story paylaşılabilir.
- **Önerilen Düzeltme:** `state.countdowns[c.key] = today;` (veya `trNow()` üzerinden hesaplanan `today` ile karşılaştırma) kullanılarak `storySlotLeft()` içindeki tüm tarih karşılaştırmaları aynı `today` (TR günü) değişkenine bağlanmalıdır.

---

### Bulgu 10 — `publishStock` bilgi postu kotasını (`infoToday`) artırmıyor ve `infoSourceOk` / `screenPhotos` denetiminden geçmiyor
- **Dosya:Satır:** `src/run.mjs:1154-1185`
- **Önem:** Orta
- **Sorun:**
  1. `publishStock()` (`satır 1154`) çalışmadan önce `infoToday >= (POSTING.maxInfoPerDay ?? 1)` kontrolü yapıyor; ancak stok postu yayınlandığında `state.posts.push({ ..., kind: "stok", ... })` (`satır 1180`) olarak kaydediyor ve `infoToday`'i artırmıyor. Sonraki çalışmada `todayPosts.filter((p) => p.kind === "bilgi" || p.kind === "arastirma")` (`satır 82`) `"stok"` türünü saymadığı için aynı gün içinde hem stok (bilgi) postu hem de normal `"bilgi"` postu yayınlanabiliyor (ayrıca `todayCount` da artırılmıyor).
  2. `publishStock` içinde `findImages` ile çekilen stok fotoğraflar `screenPhotos(..., "stock")` ve `designCheck` denetiminden geçirilmiyor (`satır 1165-1167`).
- **Somut Örnek Senaryo:** Stoktan bir bilgi postu paylaşıldıktan (`kind: "stok"`) sonraki saatlik çalışmada `infoToday` hâlâ `0` hesaplanır ve aynı gün ikinci bir bilgi postu yayınlanarak "Günde en fazla 1 bilgi postu" kuralı delinir.
- **Önerilen Düzeltme:** `satır 82`'deki filtreye `p.kind === "stok"` eklenmeli (`["bilgi", "arastirma", "stok"].includes(p.kind)`), `publishStock` içinde fotoğraflar `screenPhotos` ve `designCheck`'ten geçirilmelidir.

---

### Bulgu 11 — `.github/workflows/post.yml` içinde `repost` modu yayın penceresi ve günlük limit kontrollerinden sonra değil, `preflight` sonrasında ama `repostOne` içinde pencere/kota kontrolüyle çalışıyor (Şüpheli / Düşük)
- **Dosya:Satır:** `.github/workflows/post.yml:91`, `src/run.mjs:230-252`
- **Önem:** Düşük (Şüpheli)
- **Sorun:** `src/run.mjs:195` satırında `publishManualQueue()` döngüsü, ana `main()` fonksiyonunun en başında — yayın penceresi (`satır 230`), `preflight()` (`satır 243`) ve `--repost` (`satır 252`) kontrollerinden **önce** çalışıyor. `publishManualQueue` kendi içinde yayın penceresi ve `todayCount >= MAX_PER_DAY` kontrolü yapıyor (`satır 156-157`), ancak `preflight()` ve `recentIgCaptions()` henüz çalışmadan yayın yapıyor ve `publishManualQueue` içinde ` 1..3` adet post yayınlandığında `publishedCount` artırılmadığı için aynı çalışmada ana döngü `PER_RUN` (1) post daha yayınlayabiliyor.
- **Somut Örnek Senaryo:** Kuyrukta zamanı gelmiş 3 hazır post varken saatlik çalışma başladığında, 3 hazır post + 1 otomatik haber postu = tek çalışmada 4 post arka arkaya yayınlanabilir (`todayCount < 10` olduğu sürece). Kural "günde en fazla 10 post" olduğu için doğrudan kural ihlali sayılmayabilir (bu nedenle **şüpheli** olarak işaretlenmiştir), ancak `preflight()` öncesinde yayın denemesi yapılması token hatasında gereksiz deneme sayacı (`item.tries`) artışına yol açar.
- **Önerilen Düzeltme:** `publishManualQueue()` çağrısı `preflight()` ve yayın penceresi kontrolünden (`satır 250`) sonraya taşınabilir.
