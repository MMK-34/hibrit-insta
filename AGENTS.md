# AGENTS.md — Hibrit Portal (@hibritportal) için ajan kuralları

Bu repo, Instagram'daki @hibritportal hesabının otomatik haber botudur (CrossFit, HYROX, ATHX, koşu — Türkçe).
Bu klasörde iki ajan çalışır: **Claude Code** (ana sorumlu) ve **Antigravity** (yardımcı).
Birbirinizle doğrudan konuşamazsınız; haberleşme yalnızca `ORTAK-GOREV.md` dosyası üzerinden olur.

Kullanıcıyla her zaman **Türkçe** konuş.

## 1. Kesin yasaklar (hiçbir gerekçeyle esnemez)

- `.env` dosyasını açma, okuma, yazdırma, commit etme. Token, şifre, API anahtarı değerini asla ekrana veya dosyaya yazma.
- Instagram'a / Facebook'a doğrudan hiçbir şey gönderme, silme, düzenleme. Meta panellerinde tarayıcı otomasyonu yok.
  Paylaşım yalnızca botun kendisiyle (GitHub Actions `post.yml`) olur.
- GitHub issue #1'e **"ONAY"** yazma. Onayı yalnızca kullanıcı verir.
- Ödeme yapma, hesap açma, şifre girme.
- `main` branch'ine **push etme**. `gh workflow run` ile botu tetikleme. Bulut routine'lerine dokunma.
- `state/` klasöründeki dosyaları değiştirme (botun canlı durumu).
- Emin olmadığın hiçbir şey için tahmin yürütme: soru işareti varsa `ORTAK-GOREV.md`'ye "SORU" olarak yaz ve dur.

## 2. Çalışma düzeni (Antigravity için)

1. İşe başlamadan `ORTAK-GOREV.md`'yi oku. Yalnızca **sana atanmış** ve durumu `bekliyor` olan görevi al.
2. Görevin durumunu `yapılıyor (Antigravity)` yap.
3. Ortak `insta` klasöründe branch DEĞİŞTİRME (Claude Code ve başka oturumlar aynı klasörde main'de çalışıyor).
   Kod görevi için kendi ayrı klasörünü aç: `git worktree add ../insta-ag -b antigravity/<görev-kısa-adı> origin/main`
   ve yalnızca `../insta-ag` içinde çalış. Görev bitince commit at; worktree'yi silme, Claude Code inceleyip kaldırır.
4. Yalnızca görevde adı geçen dosyalara dokun. Claude Code aynı anda main'de çalışıyor olabilir.
5. Bitince kontrol et (bkz. madde 4), branch'e commit at, `ORTAK-GOREV.md`'de durumu `inceleme bekliyor` yap ve
   ne yaptığını 3–5 satırla yaz: değişen dosyalar, nasıl test ettin, açık kalan.
6. Rapor görevlerinde (denetim, görsel kontrol) kod değiştirme; raporu `rapor/` klasörüne `.md` olarak yaz.

Claude Code branch'i inceler, uygunsa main'e alır ve görevi `bitti` yapar.

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
```

İkisi de hatasız geçmeli. `npm run dry` gerçek API anahtarı ister; çalıştırma.

## 5. Mimari (kısa)

- `src/run.mjs` — ana akış: kaynak topla → `writePost` → `guardPost` (`src/guard.mjs`) → tekrar kontrolü → doğrulama →
  foto seçimi (`pickPhotos` / `pickEventPhotos`, `photoRuleOk`) → render (`src/render.mjs`) → yayın (`src/publish.mjs`).
- `src/plan.mjs` — yazar istemi ve şema. `src/config.mjs` — sabitler, kaynaklar.
- `manual/make.mjs` — elle hazırlanan postları `state/manual-queue.json` kuyruğuna ekler.
- `reels/weekly.mjs` — haftalık bülten videosu. `cal/` — yarış takvimi senkronu.
- `.github/workflows/post.yml` — botun bulutta çalıştığı iş.
