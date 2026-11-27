# KISA-inceleme (claude/kisa-reels)
- reels/weekly.mjs:155-164: `vertical` çıktısında `setsar=1` ve `-pix_fmt yuv420p` yok; 10-bit HDR (`yuv420p10le`) ile 8-bit ya da farklı SAR'lı IG videoları `-f concat` demuxer'da hata verir veya bozuk kare üretir.
- reels/weekly.mjs:207-209,259-268 & reels/build.mjs:42,102: `videoClip` gerçek `dur(seg)` yerine `format=duration` tabanlı teorik `len` döndürür (sesi videodan uzun kaynakta klip kısa kalır); ayrıca sahne süresi seslendirmeden (`voiceLen+0.65`) gelirken döngüsüz `NEED` (9/22 sn) uzun metinlerde sahneden kısa kalabilir.
- reels/weekly.mjs:180,260-268: Döngü haftalık bültende (`SHORT=false`) de kalktı; `igVideos` son 12 günle sınırlıyken tek 4-8 sn temiz klip `total<9` yüzünden reddedilip fotoğrafa ya da elenmeye düşer.
- src/followups.mjs:47-53 & src/run.mjs:860 (yanlış negatif): `shortRaceSame` `ş`'yi korur ama `RACE_FILL` ASCII (`yarisma|yaris`); `"yarışması/yarışı"` ve kapak fiilleri (`başlıyor/açıldı`) elenmediğinden `"Lykos Yarışması"` ~ `"lykos2event"` (`hit=1<2`) kaçar.
- src/followups.mjs:47-53 (yanlış pozitif): Şehir/ülke/genel tür (`istanbul`, `turkiye`, `ultra`, `trail`) `RACE_FILL`'de yok ve `ws` tekilleştirilmemiş; `"HYROX İstanbul"` (`ws=["istanbul"]`) `"athxistanbul"` ile, `"İda Ultra"` (`ws=["ultra"]`) `"kapadokyaultratrail"` ile eşleşip farklı yarışı 60 gün bloklar.
Karar: İtiraz (5)

## İkinci bakış
- İtiraz 1, 4, 5 giderildi (`setsar=1`/`yuv420p`, `shortRaceSame` ASCII+dolgu+tekilleştirme+smoke testi); 3 ve sahne süresi kabul.
- İtiraz 2 (`dur(out)`) giderildi, ancak yeni bir hata doğdu:
- reels/weekly.mjs:208-209,265: `getMedia` kalan süreyi `need - total` geçiyor; `need - total < 2` olunca (ör. 20.5/22 veya 7.5/9 sn) `Math.min(best.len, need + 1, ...)` < 3 sn keser, `got >= 3 ? got : 0` kalan tüm kliplerde 0 dönüp toplamı kilitler (`Math.max(3.5, need + 1)` gerekir).
Karar: İtiraz (1)

## Üçüncü bakış
- reels/weekly.mjs:266: `Math.max(3, need - total)` ile `videoClip` içi `need + 1 >= 4` sn olur; `need - total < 3` kilitlenmesi giderildi, yeni hata yok.
Karar: Onay
