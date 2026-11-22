# G9 — Türkiye Yarış Takvimi Doğrulaması (2026-11-22 – 2027-02-20)

Kaynak veri: `cal/src/data/calendar.json` (güncelleme: 2026-11-22) ve `cal/src/data/calendar.manual.json` (boş).
Takvimde 90 günlük aralıkla kesişen 4 Türkiye kaydı incelendi; ayrıca resmi kaynaklardan (TAF, belediyeler, organizatör siteleri, Circle21, HYROX, ATHX) takvimde olmayan Türkiye yarışları tarandı.

## Hatalı

| Yarış | Takvimdeki | Doğrusu | Kaynak adresi |
|---|---|---|---|
| Kuşadası Uluslararası CrossFit Şampiyonası 2026 | 2026-11-01 – 2026-11-30, Kuşadası (`expected`, "2026 duyurusu bulunamadı", 2025 haber linki) | Gerçek ad: Alsancak Team Series 2026 (8. edisyon); tarih: 2026-11-07 – 2026-11-08, Kuşadası (yapılıp tamamlandı, 90 günlük pencere dışında) | https://circle21.events/alsancak-team-series-2026 ; https://www.aydindenge.com.tr/spor/07/11/2026/kusadasinda-uluslararasi-crossfit-sampiyonasi-basladi |

## Eksik

Takvimde koşu yarışı hiç bulunmadığı için önümüzdeki 90 gün (2026-11-23 – 2027-02-20) içinde resmi duyurusu doğrulanan 17 Türkiye koşu/trail yarışı eksiktir (CrossFit, HYROX ve ATHX için takvimde olmayan resmi Türkiye yarışı bulunmadı):

| Yarış | Tarih | Şehir | Resmi adres |
|---|---|---|---|
| 10. Kar Spor İda Ultra Maratonu | 2026-11-27 – 2026-11-29 (ana yarış 2026-11-28) | Balıkesir (Edremit) | https://idaultra.com/ (HTTP 429; PassTiming https://www.passtiming.org/etkinlikler ve 22.11.2026 bülteniyle teyitli) |
| Eşitlik (Ekinoks) Koşusu | 2026-11-29 | Antalya (Muratpaşa) | https://kosu.taf.org.tr/ekinoks-kosusu-antalya |
| Büyükçekmece Sahil Efor Kupası (RUNFEST 2026) | 2026-11-29 | İstanbul (Büyükçekmece) | https://runfestistanbul.com/ |
| St. Nicholas Yarı Maratonu | 2026-12-05 – 2026-12-06 (yarışlar 2026-12-06) | Antalya (Demre) | https://www.stnicholashalfmarathon.com/ (HTTP 429; PassTiming https://www.passtiming.org/etkinlikler ve Demre Belediyesi/Rossist duyurusuyla teyitli) |
| 8. Uluslararası Mersin Maratonu | 2026-12-13 | Mersin | https://www.mbbspor.org/uluslar-arasi-mersin-maratonu |
| RunNight \| Aydos | 2026-12-19 | İstanbul (Aydos Ormanı) | https://runnight.org/aydos (çipli gece patika koşusu; organizatör sosyal etkinlik olarak tanımlıyor) |
| Dust Night Run II. (Kapalıçarşı) | 2026-12-20 | İstanbul (Kapalıçarşı) | https://www.dustevent.com/ ; https://runawayzone.com/ |
| 6. Antalya Ultra Maratonu | 2026-12-26 – 2026-12-27 | Antalya (Konyaaltı) | https://www.antalyaultra.org/ |
| 91. Büyük Atatürk Koşusu | 2026-12-27 | Ankara | https://kosu.taf.org.tr/91-buyuk-ataturk-kosusu |
| Sandras Adventure Trail | 2027-01-08 – 2027-01-10 | Muğla (Köyceğiz) | https://www.sandrasadventure.com/ |
| 17. Uluslararası Adana Kurtuluş Yarı Maratonu | 2027-01-10 (Çocuk Koşusu 2027-01-09) | Adana | https://adanakurtulusmaratonu.adana.bel.tr/ ; https://kosu.taf.org.tr/ |
| RunToStars Winter | 2027-01-16 | Erzurum (Palandöken) | https://www.runtostars.com/ (üçüncü parti takvimlerdeki 2026-12-26 eski tarihtir) |
| 16. Uğur Mumcu Yol Koşusu | 2027-01-24 | İstanbul (Kartal) | https://www.teamkronos.com/ugur-mumcu-yol-kosusu ; https://apphurra.com/etkinlik/ugur-mumcu-yol-kosusu-2027 |
| Heliz Kaş Ultra Trail | 2027-01-30 | Antalya (Kaş) | https://heliz.life/ (RaceTurkiye'deki 2027-02-27 hatalıdır) |
| Hermos Canyon Run | 2027-01-31 | Manisa (Salihli) | https://www.passtiming.org/yarisma/hermos-canyon-run (kayıt: https://www.hermesentry.com/) |
| St Paul Ultra Trail | 2027-02-06 | Antalya (Manavgat) | https://www.stpaultrailrun.com/ |
| Winter Run İstanbul V. | 2027-02-07 | İstanbul (Kadıköy) | https://runawayzone.com/etkinlik-detay/87-winter-run-istanbul-v |

*Not: 2026-11-22 (bugün) tamamlanan 4 koşu yarışı listeye alınmadı: Çenedağ Ultra Trail (Kocaeli), 8. Gazi Yarı Maratonu (Gaziantep), Manisa Ultra Marathon (Manisa), KeşifRun Nilüfer (Bursa). 2026-11-29 tarihli Öğretmenler Günü Koşusu (İstanbul / Bakırköy) iptal edildiği için eklenmedi. HYROX (`hyrox.com/find-my-race/`, `turkiye.hyrox.com`, `hyroxturkiye.com`) ve ATHX (`athxgames.com`) için bu 90 günde duyurulmuş Türkiye yarışı yok.*

## Doğrulandı

2 yarış doğrulandı: VU BOX HYROX-style 50% (2026-12-19, Samsun — salon simülasyonu; `website` alanı `www.vubox.com` boş, güncel site `vuboxofficial.com`), Olympos Games (2026-12-19 – 2026-12-20, Antalya).

## Doğrulanamadı

- **Battle of Anatolia 2026/2027** *(takvimde 2026-11-01 – 2026-11-30, İstanbul / Ankara, `expected`)*: `https://www.battleofanatolia.com/` erişilemiyor (`fetch failed`); Competition Corner ve diğer kanallarda 2026/2027 resmi duyurusu yok.
- **10. Göbeklitepe Yarı Maratonu** *(üçüncü parti takvimlerde 2026-12-06, Şanlıurfa)*: `kosu.taf.org.tr/yarisma/291` 404 döndü, güncel `kosu.taf.org.tr` listesinde ve `sanliurfa.bel.tr` anasayfasında resmi kayıt bulunamadı.
- **Osmaniye Yarı Maratonu** *(Advenway'de 2026-12-27 "durum belirsiz", Osmaniye)*: `kosu.taf.org.tr` üzerinde yalnızca 2025 (21 Aralık 2025) kaydı var; 2026 resmi duyurusu doğrulanamadı.
- **Bodrun Ultra Maratonu 2027** *(PassTiming takviminde 2027-02-13, Bodrum / Muğla — "Timing provider not specified")*: resmi site `https://www.bodrun.org/` üzerinde 2027 tarihi yayımlanmamış (2025 verisi duruyor).
- **27. Alanya Atatürk Halk Koşusu** *(Şubat ortası, Alanya / Antalya)*: 2027 kesin tarihi henüz resmi olarak duyurulmadı.
- **12. Uluslararası Edirne Yarı Maratonu 5K** *(`kosu.taf.org.tr` üzerinde 2027-01-27, "Başlamadı")*: aynı yarışın 10K kaydı ve duyurulan takvimi 2027-09-05 olduğundan 2027-01-27 tarihi portal giriş hatası olarak görünüyor, doğrulanamadı.
