# ORTAK-GOREV.md — Claude Code ↔ Antigravity görev panosu

Kurallar: `AGENTS.md`. Durumlar: `bekliyor` → `yapılıyor (<ajan>)` → `inceleme bekliyor` → `bitti` (ya da `SORU`).
Yalnızca sana atanmış görevi al. Bitince altına kısa not yaz. Soruları en alttaki "Sorular" bölümüne yaz.

---

## G1 — Bağımsız sistem denetimi (rapor)
- **Atanan:** Antigravity
- **Durum:** bekliyor
- **Kod değiştirme yok.** Çıktı: `rapor/G1-denetim.md`
- Yapılacak: `src/run.mjs`, `src/guard.mjs`, `src/plan.mjs`, `src/event-photos.mjs`, `manual/make.mjs`,
  `.github/workflows/post.yml` dosyalarını `AGENTS.md` madde 3'teki kurallara göre baştan sona oku.
  Kuralların kodda gerçekten uygulanıp uygulanmadığını kontrol et (ör. günlük 10 post sınırı, bilgi postu kotası,
  story kotası, görsel kuralı, rakam kuralı, kategori adı yasağı).
- Her bulgu için: dosya:satır, sorun, somut örnek senaryo, önerilen düzeltme, önem (yüksek/orta/düşük).
  Emin olmadığın bulguyu "şüpheli" diye işaretle; uydurma bulgu yazma.
- Notlar:

## G2 — Replay test paketi
- **Atanan:** Antigravity
- **Durum:** bekliyor
- **Branch:** `antigravity/replay-test`
- Yapılacak: `scripts/replay-test.mjs` yaz. `src/guard.mjs` içindeki kontrolleri (rakam kuralı, kategori adı,
  şapkalı harf, `hl` kontrolü vb.) örnek metinlerle test etsin: kuralı ihlal eden örnekler yakalanmalı,
  temiz örnekler (ör. "peynir altı suyu", "%0,087 seviyesine", "bir") yakalanmamalı.
  Test verisi `scripts/replay-fixtures.json` içinde dursun. Ağ veya API anahtarı gerektirmesin.
  `node scripts/replay-test.mjs` → geçen/kalan sayısı, kalan varsa çıkış kodu 1.
- Dokunulacak dosyalar: yalnızca `scripts/replay-test.mjs`, `scripts/replay-fixtures.json`.
  `src/` içinde değişiklik gerekiyorsa yapma, notlara yaz.
- Notlar:

## G3 — Takvim senkronu zaman aşımı (teşhis)
- **Atanan:** Antigravity
- **Durum:** bekliyor
- **Branch:** `antigravity/takvim-teshis`
- Sorun: `post.yml` → "Yarış takvimi senkronu" adımı (`cal/scripts/sync-calendar.mjs`) 240 sn'de kesiliyor:
  "takvim hatası, son sağlam veri korundu" (2026-11-22, iki çalışmada).
- Yapılacak: hangi kaynağın/isteğin takıldığını bul (istek başına zaman aşımı var mı? sıralı mı çalışıyor?).
  Önce teşhisi notlara yaz; düzeltme küçük ve net ise branch'te yap. Takvim verisi dosyalarını elle değiştirme.
- Notlar:

## G4 — Post görsel kontrolü (rapor)
- **Atanan:** Antigravity
- **Durum:** bekliyor
- **Kod değiştirme yok.** Çıktı: `rapor/G4-gorsel.md`
- Yapılacak: Kullanıcı sana son postların ekran görüntülerini/slayt görsellerini verecek (verilmezse bu görevi
  `SORU` yap ve dur — Instagram'a kendin girme). Her post için kontrol et: foto konuyla ilgili mi, olay postunda
  yalnızca olayın kendi görseli mi, yazı taşıyor mu, logo/yüz kesiliyor mu, kırmızı vurgu doğru kelimede mi.
- Notlar:

---

## Sorular
(Ajanlar buraya yazar, kullanıcı/Claude Code cevaplar.)
