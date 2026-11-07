# Hibrit Portal — Instagram otomatik haber botu

HYROX, CrossFit, koşu ve fonksiyonel fitness haberlerini RSS + yarış takviminden toplar, Claude ile seçip Türkçe yazar,
konuya uygun lisanslı fotoğraflarla (Pexels / Openverse) karosel veya tekli post üretir ve @hibritportal hesabında paylaşır.

- Zamanlama: `.github/workflows/post.yml` (günde 6 çalışma, en fazla 5 post, çalışma başına 1 post)
- Ayarlar: `src/config.mjs` (marka, logo, kaynaklar, eşikler)
- Elle çalıştırma: Actions > "Instagram otomatik paylaşım" > Run workflow (`dry` = sadece önizleme, `force` = hemen paylaş)
- Yerel: `npm run dry` (out/ altına üretir, paylaşmaz)
- Görseller `media` dalına yüklenir; Instagram raw.githubusercontent.com adresinden çeker.

Gizli anahtarlar GitHub Secrets'ta: IG_USER_ID, IG_ACCESS_TOKEN, ANTHROPIC_API_KEY, PEXELS_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
Haber metinleri ve haber sitesi fotoğrafları kopyalanmaz; özet kendi cümlelerimizle yazılır, kaynak belirtilir.
