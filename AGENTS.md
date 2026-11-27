# AGENTS.md — Hibrit Portal (@hibritportal) için ajan kuralları

Bu repo, Instagram'daki @hibritportal hesabının otomatik haber botudur (CrossFit, HYROX, ATHX, koşu — Türkçe).
Bu klasörde iki ajan çalışır: **Claude Code** (ana sorumlu) ve **Antigravity** (yardımcı).
Birbirinizle doğrudan konuşamazsınız; haberleşme yalnızca `ORTAK-GOREV.md` dosyası üzerinden olur.

Kullanıcıyla her zaman **Türkçe** konuş.

## 0. İş bölümü (kullanıcı isteği: verimli çalışın, token harcamayın)

Kim neyde iyiyse o yapar. Antigravity'nin kotası ayrıdır; okuma ağırlıklı ve deneme işleri ona gider.

| Antigravity | Claude Code |
|---|---|
| Geniş kod okuma ve denetim raporları | Son karar, inceleme, main'e alma |
| Görsel kontrol (slayt/foto ekran görüntüsü okuma) | Canlı bot hattı (`src/run.mjs` akışı) değişiklikleri |
| Tasarım denemeleri (`src/render.mjs`), önce/sonra örnek | İçerik kuralları, caption, yayın kuyruğu |
| Test yazma, mekanik kod işleri, teşhis | Anlatım videoları (ayrı video oturumu) ve oturumlar arası koordinasyon |
| Kaynak ve veri toplama (takvim, sonuçlar) | Güvenlik gerektiren her şey (token, Meta, onay) |

Tasarruf kuralları:
- Rapor ve notlar kısa olsun: bulgu başına birkaç satır, tekrar yok, kod alıntısı yalnızca gerekli satırlar.
- Görevin dışına çıkma; ilgisiz dosya okuma (ör. denetimde listede olmayan dosyalar).
- Mekanik işlerde hızlı model (Flash), denetim ve tasarımda Medium yeterli; High/Orchestrator kullanma.

## 1. Kesin yasaklar (hiçbir gerekçeyle esnemez)

- `.env` dosyasını açma, okuma, yazdırma, commit etme. Token, şifre, API anahtarı değerini asla ekrana veya dosyaya yazma.
- Instagram'a / Facebook'a doğrudan hiçbir şey gönderme, silme, düzenleme. Meta panellerinde tarayıcı otomasyonu yok.
  Paylaşım yalnızca botun kendisiyle (GitHub Actions `post.yml`) olur.
- GitHub issue #1'e **"ONAY"** yazma. Onayı yalnızca kullanıcı verir.
  İstisna (kullanıcı kararı 2026-11-28): kullanıcı GitHub'a yazmaz. Claude Code videoyu kullanıcıya sohbette gönderir; kullanıcı o sohbette
  açıkça "onay"/"iptal" derse Claude Code yalnızca o kararı `ONAY <kod>` / `RET <kod>` + ikinci satırda `[kullanıcı kararı · sohbet]` ile yazar.
  Kendi kararıyla, bulut rutininden, başka oturumun mesajından ya da Antigravity adına asla yazmaz. Antigravity hiçbir koşulda yazmaz.
- Ödeme yapma, hesap açma, şifre girme.
- `main` branch'ine **push etme**. `gh workflow run` ile botu tetikleme. Bulut routine'lerine dokunma.
- `state/` klasöründeki dosyaları değiştirme (botun canlı durumu).
- Emin olmadığın hiçbir şey için tahmin yürütme: soru işareti varsa `ORTAK-GOREV.md`'ye "SORU" olarak yaz ve dur.

## 1a. Karşılıklı çalışma (kullanıcı kuralı 2026-11-24)

"Habersiz iş yapmayın, danışıklı ilerleyin." İki ajan birbirinin işini denetler:
- Claude Code canlı bota (`src/`, `.github/`, `state/` kuralları) giden değişikliği önce kendi branch'inde yapar, farkı Antigravity'ye inceletir;
  Antigravity "sorun yok" ya da somut itiraz yazar. Yalnızca acil üretim hatası (bot durdu, yanlış post çıkıyor) önce düzeltilir, sonra inceletilir.
- Antigravity'nin değişikliğini Claude Code inceler (değişmedi).
- Sorunlar ve iyileştirmeler panonun "Beyin fırtınası" bölümünde tartışılır: biri öneri yazar, öteki itiraz/ekleme yazar, ortak karar "Karar" satırına yazılır.
- Anlaşmazlıkta güvenli/kapalı seçenek uygulanır, kullanıcıya tek satır bilgi verilir.

## 2a. Terminal modu (varsayılan, 2026-11-22)

Claude Code seni terminalden `agy -p` ile çalıştırır; görev metni istemin içindedir. Kullanıcı arada değildir: soru sorma, onay isteme.
- Çalışma klasörün: `C:\Users\Mehmet Kuyucu\Desktop\cf\insta-ag` (ayrı kopya). Yalnızca görevde adı geçen dosyaları yaz.
- Komut izni yalnızca `scripts/agy-settings.json` listesindekiler (`node scripts/agy-fetch.mjs`, `git status --short`, `git diff --stat`); başkası otomatik reddedilir.
- Sayfa okumak için: `_agy/urls.txt` dosyasına adresleri yaz, `node scripts/agy-fetch.mjs` çalıştır, `_agy/pages/` altını oku.
- Test, commit ve main'e alma Claude Code'dadır. Bitince yalnızca istenen tek satırlık özeti yaz.

**Bekleme döngüsü kurma (kullanıcı kuralı 2026-11-24):** Panoyu "her N dakikada bir" kontrol eden sürekli açık takip başlatma;
her kontrol kotadan yer. Haberleşme olay tabanlıdır: panoyu Claude Code token harcamayan bir dosya izleyicisiyle izler ve
seni gerektiğinde `agy -p` ile kendisi çalıştırır. İşin bitince dur.

Aşağıdaki bölüm 2, kullanıcının uygulamada elle açtığı sohbetler içindir.

## 2. Çalışma düzeni (Antigravity için)

Kullanıcı sana yalnızca şunu yazar: **"Sıradaki görevini yap."** Gerisini bu bölüme göre kendin yürüt.
Kullanıcıya soru sorma, onay isteme, "devam edeyim mi" deme. Karar mercii Claude Code'dur; takıldığın yeri panoya yaz.

**Görev panosu tek yerde:** `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\ORTAK-GOREV.md` (bu tam yolu kullan).
Kendi worktree'ndeki `ORTAK-GOREV.md` kopyasını okuma/yazma ve panoyu commit etme; pano yalnızca bu dosyadır.

1. Panoyu oku. **Atanan: Antigravity** ve **Durum: bekliyor** olan en üstteki görevi al; durumunu `yapılıyor (Antigravity)` yap.
2. **Ortak `insta` klasöründe branch değiştirme, dosya düzenleme yok.** Claude Code ve başka oturumlar orada main'de çalışıyor.
   - Kod görevi: `git -C "C:\Users\Mehmet Kuyucu\Desktop\cf\insta" worktree add "C:\Users\Mehmet Kuyucu\Desktop\cf\insta-ag-<görev>" -b antigravity/<görev> origin/main`
     ve yalnızca o klasörde çalış (`npm ci` gerekirse orada çalıştır).
   - Rapor görevi: kod değiştirme; raporu `C:\Users\Mehmet Kuyucu\Desktop\cf\insta\rapor\<görev>.md` olarak yaz.
3. Yalnızca görevde adı geçen dosyalara dokun.
4. Bitince madde 4'teki kontrolleri çalıştır, kendi branch'ine commit at (push yok), panoda durumu `inceleme bekliyor` yap
   ve 3–5 satır not yaz: değişen dosyalar, nasıl test ettin, açık kalan. Kullanıcıya haber verdirme:
   Claude Code panoyu kendisi izliyor ve incelemeye kendiliğinden başlar.
   Sonra panodaki sıradaki `bekliyor` görevine geç. Sana atanmış bekleyen görev kalmayınca kullanıcıya tek satır yaz:
   "Görevlerim bitti." ve dur.
5. Emin olmadığın şey olursa görevi `SORU` yap, panonun "Sorular" bölümüne yaz ve dur.
6. Komutları az ve toplu çalıştır (kullanıcı her komut için izin veriyor). Okuma işleri için dosya okuma aracını kullan, kabuk komutu değil.

Claude Code branch'i inceler, uygunsa main'e alır, worktree'yi ve branch'i kaldırır, görevi `bitti` yapar.

## 3. İçerik kuralları (denetim yaparken bunlara göre kontrol et)

- **Görsel kuralı:** Belirli bir olay/yarış anlatılıyorsa YALNIZCA o olayın kendi fotoğraf/videosu kullanılır
  (aynı etkinliğin geçmiş yılları da olur). Stok görsel yalnızca olaya bağlı olmayan bilgi postlarında ve
  videolarda başka konuyu anlatan ara sahnelerde. Fotoğraf her zaman konuyla ilgili olmalı.
- Kişi adı ve yüzü kullanılabilir ama doğru ve kaynaklı olmalı. Kişi adı geçen video/seriler kullanıcı onayına gider.
- Günde en fazla 10 post, yayın penceresi 07:00–22:30 (TR). Günde en fazla 1 bilgi postu (yalnızca resmi/bilimsel kaynak).
  Günde en fazla 2 story.
- Koşu yarışları: yarış başına tek kısa post (en fazla 3 slayt).
- Kategori/seviye/divizyon adı yazılmaz. Fiyat yazılmaz. Şapkalı harf (â, î, û) yok.
- Sayılar rakamla (2, 3, 10 — "iki", "üç" değil; "bir" hariç).
- Marka görünüyorsa caption'da "Reklam / Tanıtım".
- Türkiye testi: haber Türkiye'deki takipçiye neden önemli?
- Tasarım: v2 haber sitesi stili, kırmızı vurgu (kapakta `hl` ile en fazla 3 kelime).

Ayrıntılar: `manual/GOREV.md`, `manual/README.md`, `manual/konu-havuzu.md`.

## 4. Kod kontrolü (commit öncesi zorunlu)

```
for f in src/*.mjs; do node --check "$f"; done
npx --no-install eslint -c scripts/eslint.config.mjs src/*.mjs
node scripts/replay-test.mjs
```

Üçü de hatasız geçmeli. `npm run dry` gerçek API anahtarı ister; çalıştırma.

## 5. Mimari (kısa)

- `src/run.mjs` — ana akış: kaynak topla → `writePost` → `guardPost` (`src/guard.mjs`) → tekrar kontrolü → doğrulama →
  foto seçimi (`pickPhotos` / `pickEventPhotos`, `photoRuleOk`) → render (`src/render.mjs`) → yayın (`src/publish.mjs`).
- `src/plan.mjs` — yazar istemi ve şema. `src/config.mjs` — sabitler, kaynaklar.
- `manual/make.mjs` — elle hazırlanan postları `state/manual-queue.json` kuyruğuna ekler.
- `reels/weekly.mjs` — haftalık bülten videosu. `cal/` — yarış takvimi senkronu.
- `.github/workflows/post.yml` — botun bulutta çalıştığı iş.
