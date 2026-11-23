# BF1-5 İnceleme (src/collect.mjs)
- **Karar:** İtiraz (yanlış eleme ve BIG_RACES bağımlılığı).
- **Döngüsel içe aktarma / yan etki:** Yok (`collect.mjs -> countdown.mjs -> circle21.mjs -> safe-net.mjs` çevrimsiz, üst düzey yan etki yok).
- **feedCat eşlemesi:** Doğru (`kosu -> kosu`, `trail -> doga`; `plan.mjs` ve `run.mjs` `ONE_POST_CATS` ile uyumlu).
- **Yanlış eleme 1 (Majorlar ve bilinen yarışlar):** `BIG_RACES` Dünya Maraton Majorlarını (Berlin, Londra, Boston, Chicago, New York, Tokyo, Sidney) içermiyor; `plan.mjs:253` ve `run.mjs:502` bunları kapsamda tutarken takvimden gelen `kosu` kayıtları elenir (`Runatolia` ve `Salomon Eksi 2'ler` de eşleşmez).
- **Yanlış eleme 2 (Türkçe harf duyarlılığı):** JS `/i` bayrağı `ı`/`I` ve `İ`/`i` eşleştirmez; `İSTANBUL YARI MARATONU` veya `BODRUM YARI MARATONU` gibi büyük harfli kayıtlar `/Yarı/i` deseninden geçmez.
- **Bakım yan etkisi:** Bu yarışları `BIG_RACES`'e eklemek `countdown.mjs` geri sayım hikâyelerini de tetikler.
- **Öneri:** `collect.mjs`'te `BIG_RACES` yanında major desenini (`run.mjs:502`) ayrıca kabul et; `BIG_RACES` desenlerinde `[İI]`/`[ıi]` veya Türkçe küçük harf normalizasyonu kullan.
