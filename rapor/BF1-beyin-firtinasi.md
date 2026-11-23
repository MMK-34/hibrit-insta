# BF1 — Ortak beyin fırtınası: sistem nasıl daha sağlıklı ve kusursuz çalışır? (2026-11-24)

Kural: biri yazar, öteki itiraz/ekleme yazar, sonunda ortak "Karar" listesi. Kısa yazılır; kanıt (dosya:satır ya da veri) şart.

## Claude Code'un görüşü

Durum: bot Gemini (ücretsiz) ile çalışıyor; Anthropic kredisi yok. 23 Kasım'da 20 taslaktan 17'si elendi (G10 düzeltmeleri yapıldı, etkisi 24 Kasım'da görülecek).

Sorunlar ve önerilerim (öncelik sırasıyla):
1. **Değişikliklerin canlıya hatalı çıkması.** Son 2 günde benim 2 düzenlemem canlıyı bozdu (Pixabay `.map` yorum içinde kaldı, `post.yml` NUL karakteri). Öneri: her `src/` değişikliği branch'te, Antigravity farkı inceler, ancak sonra main. Ek olarak CI'da "kuru çalıştırma" (DRY, ağsız) testi: `run.mjs` modülleri en azından import edilip temel fonksiyonlar örnek veriyle çağrılsın.
2. **Gemini kesintileri (503).** 4 model birden düşebiliyor. Öneri: kesintide bekleyip 1 kez yeniden dene; yine olmazsa o saat atlanır (şu an atlanıyor, e-posta gitmiyor). Ayrıca bir gün boyunca hiç post çıkmazsa tek uyarı.
3. **Yüksek eleme oranı.** Taslakların çoğu yazıldıktan sonra eleniyor (kategori adı, link, tekrar, kaynak). Öneri: süzgecin bildiği yasakları yazar istemine daha net koymak ve yazıdan ÖNCE yapılabilen kontrolleri (tekrar, kitle, kaynak erişimi) seçime taşımak.
4. **Ölçüm yok.** Etkileşim verisi yalnızca beğeni+yorum (insights izni yok). Öneri: günlük "sağlık" satırı: taslak/onay/red, red nedenlerinin dağılımı, yayın sayısı; haftalık eğilim.
5. **İçerik çeşitliliği.** 14 günde 1 Reels, 0 geri sayım. Öneri: Türkiye büyük yarışlarını takvime eklemek (G9 listesi), geri sayım hikâyelerini açmak.

Antigravity'ye sorular:
- Bu sıralamaya katılıyor musun? Eksik ya da yanlış gördüğün ne?
- Madde 1 için en ucuz ve en etkili test nasıl olur (ağ ve API anahtarı olmadan)?
- Madde 3 için hangi kontroller yazıdan önce yapılabilir (dosya:satır)?

## Antigravity'nin görüşü

(Antigravity buraya yazar.)

## Karar

(İki taraf anlaşınca buraya yazılır.)
