# BF1 (Madde 2–3) İnceleme Raporu

**Karar:** İtiraz (4 itiraz)

1. **Kaynak adı dönüşümü (`src/guard.mjs`) — Alan adı sızması:** Sorun yok. Nokta ve TLD silinip düz kelimeye çevriliyor; `LINKISH_RE` ve `DOMAIN_ANYCASE_RE` hâlâ `Kaynak:` satırını da denetliyor (muafiyet yok).
2. **Kaynak adı dönüşümü — Hata/yan etki (İTİRAZ 1):** Yeni regex `URL_RE` öncesinde çalıştığı için:
   - `www.barbend.com` → `"Www"` olur ve `URL_RE` atlanır (`Kaynak: Www` yayınlanır); `m.site.com` → `"M"` olur.
   - `barbend.com/haber/1` → `/` sonrası silinmez, `URL_RE` eşleşmez ve `"Barbendhaber1"` çöp metni kalır.
   - Alt çizgili IG adları (`@cf_olympos.games`) parçalanır (`cfOlympos`).
   - **Öneri:** Önce `https?://\S+` temizle; regex'te `(?<![\p{L}\p{N}_.-])(?:[wW]{3}\.)?`, ilk grupta `_` desteği ve sonda `(?:[\/?#]\S*)?` kullan.
3. **`CAT_WORDS`'e `Pro|Open|Doubles|Relay` eklenmesi (`src/run.mjs`) (İTİRAZ 2):** `dropCategories` tek eşleşmede tüm cümleyi silip `srcItems`'ı `writePost` ve `verifyGate` öncesinde değiştiriyor.
   - `"CrossFit Open 2026 ... division/kategori ..."` duyuru cümleleri ile `"X won the Pro/Doubles/Relay division in 53:22"` gibi temel HYROX sonuç/rekor cümleleri silinir; yazar skoru kaybeder veya denetçi kaynakta bulamayıp postu eler.
   - **Öneri:** `Pro|Open|Doubles|Relay` için tek eşleşmede tüm cümleyi silme; en az 2 kategori kelimesi geçen liste cümlelerini sil veya `(?<!CrossFit\s)Open` ile yalnızca kategori öbeğini çıkar.
4. **`STOPW` eklemeleri (`src/run.mjs`) (İTİRAZ 3):** `titleSim` en az 3 kök istiyor (`Math.min(A.size, B.size) < 3` → `0`). Kısa (4–6 kelimelik) başlıklardan konu belirleyici `dünya`, `şampiyonası`, `rekor`, `rekoru` atılınca kök sayısı 2'ye düşüp gerçek tekrarlar kaçıyor (ör. `"CrossFit'te dünya rekoru kırıldı"`, `"HYROX Dünya Şampiyonası tarihleri açıklandı"` → 2 kök → `sim=0`).
   - **Öneri:** `dünya`, `şampiyonası`, `rekor`, `rekoru` kelimelerini `STOPW`'dan çıkar; yalnızca dolgu kelimeleri (`sporcu`, `sporcular`, `kazandı`, `kazanan`, `birinci`, `derece`) tut.
5. **`selectNews` 503 değişikliği (`src/run.mjs`) (İTİRAZ 4 — küçük):** `isTransientAi(e)` ile uyarı ve `exitCode=1` bastırması tutarlı, 48 saat alarmı korunuyor. Ancak akşam boş günde (`isLast && todayCount === 0`) akış `publishStock()`'a düşer; `geminiDownUntil` aktifken (veya `BudgetError`'da) `designCheck` kesin hata verir, `failAttempt` hem `⚠️` uyarısı atar hem stok öğesinin 2 deneme hakkından 1'ini yakar.
   - **Öneri:** `if (isTransientAi(e)) return;` ile doğrudan çık (günlük özet ve 48 saat alarmı `main()` sonrası yine çalışır).
6. **`src/plan.mjs` prompt düzeltmeleri (satır 252, 266, 430):** Sorun yok. Yerel koşu, kategori ve `1.500 TL` çelişkileri temizlenmiş, yan etki yok.
