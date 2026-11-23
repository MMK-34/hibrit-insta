# G10 — 2026-11-23 Eleme ve Düzeltme Kontrolü

## 1. Elenen 17 Taslak (4 doğru, 4 yanlış, 9 boşa)
1. **DOĞRU** — Çatalkaya Ultra Trail: kural gereği "yaş gruplarında" yasak; yazar 2 denemede çıkaramadı.
2. **DOĞRU** — HYROX Dallas: kural gereği kategori/divizyon adı yasak (`dropCategories` "Pro"yu silmemiş).
3. **YANLIŞ** — HYROX Dubai: yakın ülke onaylı yarış, yayınlanabilirdi; `hyrox.com` 403 teknik engeli.
4. **BOŞA** — Mayhem Madness takip: arşiv kaydı olmayan yarışa otomatik takip açıldı (`factsOk=false`).
5. **BOŞA** — Jamberoo kürek hikâyesi: Avustralya yerel hikâye (Türkiye testi dışı); ayrıca `tekrar` yanlış pozitif (farklı sporcuyla eşleşti).
6. **YANLIŞ** — HYROX London: yakın ülke onaylı yarış, yayınlanabilirdi; `hyrox.com` 403 engeli (takvimde 02–07/02–06 çift kayıt var).
7. **BOŞA** — Dubai Fitness Championship: `status="expected"`, kaynaksız 1–31 Aralık tahmini; aday olmamalıydı.
8. **BOŞA** — Wolf Haven takip: arşivsiz yerel yarışa otomatik takip açıldı (`factsOk=false`).
9. **BOŞA** — `@tiranathrowdown` Flash Sale: indirim promosyonu, haber değeri yok; IG süzgeci/seçici atmalıydı.
10. **DOĞRU** — `@hyroxuk` Elite 15: divizyon adı kural gereği yasak; süzgeç doğru eledi.
11. **BOŞA** — İda Ultra (yenibakishaber): koşu yarışı zaten paylaşıldı; `dupPre` "Kar Spor" öneki yüzünden kaçırdı.
12. **BOŞA** — Ha Thi Hau (Vietnam.vn): yurt dışı patika koşusu (Türkiye testi dışı); ayrıca `Kaynak: Vietnam.vn` süzgeçte sahte pozitif.
13. **BOŞA** — İda Ultra (hibya): 11. ile aynı; 1 saat sonra yine `dupPre` kaçırıp taslak yaktı.
14. **YANLIŞ** — HYROX Milan: yakın ülke onaylı yarış, yayınlanabilirdi; `hyrox.com` 403 engeli.
15. **DOĞRU** — iF3 "FRAN": Circle 21 sayfasında Belçika yok ve takvimde `city: undefined` bozuk veri var.
16. **BOŞA** — `@olympos.games` "Sponsorumuz": sponsor reklamı aday olmamalıydı; ayrıca noktalı IG adı `Kaynak:` satırında `LINKISH_RE` tuzağına düşüyor.
17. **YANLIŞ** — HYROX Rio: yayınlanabilir HYROX sonucu; `guard.mjs:120` kelime sınırı olmadan "Brezilya" içindeki "rezil"i yakaladı.

## 2. Düzeltme İncelemesi (`edea84f` — 4 sorun)
- `referenceIsSource` kontrolü: `srcItems.every(/^(c21|cal:)/)` yalnızca `c21`/`cal:` kaynaklarında `true` olur (karma kaynakta açılmaz). Ancak şu 4 sorun var:
1. **Takvim hatası denetçiden kaçar (döngüsel onay):** `cal:` snippet'i "birincil kaynak" diye verilip `referenceIsSource=true` olunca `verify.mjs:103` ikinci denetçiyi kapatır ve sistem istemi (`verify.mjs:50`) web'e gitme der. `calendar.json`'daki hatalar (`HYROX Cairo` `country:"Cairo"`, `iF3` `city:undefined`, `HYROX London` 02–07 vs 02–06 çift kayıt) denetçiden doğrudan geçer.
2. **Yanıltıcı kaynak etiketi (`run.mjs:540`):** Tüm `cal:` kayıtları "resmî etkinlik sayfasından (JSON-LD)" diye etiketleniyor; oysa tüm `hyrox-2026-*` kayıtları 3. parti `hyresult.com`'dan, bazıları GOWOD/elle girişten geliyor.
3. **Boş `status` filtreden geçer (`collect.mjs:126`):** `if (e.status && e.status !== "confirmed")` yazıldığı için `status` alanı olmayan kayıtlar elenmez (`e.status !== "confirmed"` olmalı).
4. **Bozuk/kapsam dışı `cal:` adayları (`collect.mjs:128-135`):** `e.city` boşsa başlık/snippet'e `"undefined"` yazılıyor; ayrıca `upcomingEvents()` yurt dışı ATHX (`APHOBOS x ATHX Simulation`, UK, `confirmed`) filtresi yapmıyor.

## 3. Taslak Hakkını Boşa Harcayan Diğer Kalıplar
- **`dupPre` önek körlüğü (`run.mjs:342,423`):** `posted.json`'daki `"Kar Spor İda Ultra Maraton"` gibi sponsorlu adlar `t.includes(pk)` eşleşmesini bozuyor; aynı koşu yarışı her haber sitesinden tekrar taslağa giriyor (#11, #13).
- **Arşivsiz otomatik takip (`followups.mjs:46`):** `archiveText` boş olan yerel/küçük yarışlara +4/+9 gün takip planlanıyor; özellikle web aramasız/kısıtlı modda `factsOk=false` ile taslak yakıyor (#4, #8).
- **IG promosyon/sponsor gürültüsü + `Kaynak:` link tuzağı (`ig-watch.mjs:80`, `guard.mjs:108,132`):** Flash sale/sponsor gönderileri aday oluyor; ayrıca `@olympos.games`, `@xchallenge.tr` gibi noktalı IG adları (`@` silinince) ve `.vn` yayıncıları `LINKISH_RE` yüzünden geçerli postları da eler.
- **Süzgeç/tekrar sahte pozitifleri (`guard.mjs:120`, `run.mjs:446`):** `rezil` kelime sınırsız ("Brezilya"yı eler); `recentSameStory` ortak kelimelerle ilgisiz sporcuları eşleyebiliyor (#5, #17).
