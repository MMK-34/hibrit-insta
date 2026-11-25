# CTA İncelemesi
Genel: `plan.mjs` ve `manual/README.md` değişikliği yerinde; `guard.mjs` `stripCta` ve kapsamda 3 somut sorun var.

1. **Haber/bilgi cümlesini yanlış silme (`src/guard.mjs` `stripCta`):** Tüm caption gövdesinde bağlamsız çalışıyor. "Canlı sonuçları federasyon sitesinden takip edin.", "Skorunu sisteme kaydet.", "Belgeleri son tarihe kadar gönderin." gibi gerçek bilgi cümleleri silinir; virgülle bağlı "Kayıt 10 Nisan'da, planın için kaydet." komple gider. Yalnızca son cümle/paragrafla sınırlanmalı veya CTA bağlamı (arkadaş/ona/bunu/plan/hesap) aranmalı.
2. **Kaçan kalıplar (`CTA_SENT`):**
   - **Emoji sonu:** `plan.mjs` 2 emojiye izin verirken regex yalnızca `[.!]*$` bekliyor; "Arkadaşına gönder 👇", "Planın için kaydet 📌" geçer.
   - **Diğer yaygın yapılar:** "Paylaşmayı/kaydetmeyi/göndermeyi unutma." (`cliche` yalnızca `unutmayın` yakalıyor, tekil `unutma` geçer), "gönderebilirsin / kaydedebilirsin", "takipte kal(ın)", "-iniz" eki ve büyük `İ` (`GÖNDERİN`; JS `/iu` `İ` ile eşleşmez) kaçar.
3. **Slayt kapsamı (`src/guard.mjs` `guardPost`, `src/series.mjs` `sehir`):** `stripCta` yalnızca `caption`'da çalışıyor; model `end` slaytı `body` alanına CTA yazarsa geçer. Ayrıca `series.mjs`'de `sehir` `end.body` içindeki "Şehrinizi yorumlara yazın, listesini hazırlayalım." cümlesi de birlikte silinmiş (diğer 4 seride korunuyor).

Not (satır/paragraf): Son satır ve boş satırlı paragraf temizliği sağlam; yalnızca bitişik satırlarda ortadaki satır silinirse (`A.\nKaydet.\nB.`) fazladan boş satır (`\n\n`) oluşur ve boşluksuz `"...?Ona gönder."` soruyu da siler.

Karar: İtiraz (3)

## İkinci bakış
1. Gövde koruması: `stripCta` yalnızca sondaki çağrıları ve gövdede açık `arkadaş... gönder/yolla/etiketle` satırlarını temizliyor; bilgi cümleleri korunuyor. (Giderildi)
2. Kalıplar: Emoji sonu (`TRAIL`), `-mayı unutma`, `-ebilirsin`, `-iniz`, `takipte kal` ve Türkçe `toLocaleLowerCase("tr")` eklendi. (Giderildi)
3. Kapsam ve test: `guardPost` `end.body` için de `stripCta` çalıştırıyor, `series.mjs` `sehir` yorum cümlesi korundu; satır/boşluksuz `?` notları smoke testleriyle doğrulandı. (Giderildi)
Not (küçük, engel değil): `etiketleyebilirsin`/`yollayabilirsin` için `y` kaynaştırması ve `CTA_SOCIAL`'da büyük `İ` yok; pratikte düşük olasılık.
Karar: Onay
