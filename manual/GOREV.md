Türkçe konuş. Görev: @hibritportal Instagram haber hesabı için, Anthropic API kredisi yokken postu SEN (Claude Code) hazırla; paylaşımı bulut bot yapar.

Çalışma klasörü: C:\Users\Mehmet Kuyucu\Desktop\cf\insta (git deposu MMK-34/hibrit-insta, dal main). Önce `git pull --rebase`.

1) `node -e "console.log(JSON.stringify(require('./state/posted.json').paused||null))"` çalıştır. Çıktı null ise (bot API ile kendisi çalışıyor) HİÇBİR ŞEY YAPMADAN "bot çalışıyor, elle post gerekmez" de ve bitir.
2) `manual/README.md` dosyasını baştan sona oku: akış, kesin kurallar ve posts.json biçimi oradadır. Kurallara harfiyen uy.
3) `node manual/cands.mjs` ile adayları, bugün paylaşılan post sayısını, son 40 başlığı ve hazır post sırasını gör. Bugün paylaşılan + sırada bugüne planlı toplam 5 veya fazlaysa bitir.
4) Kurallara uyan, daha önce paylaşılmamış, son 48 saatteki en değerli EN ÇOK 2 haberi seç (CrossFit/HYROX/ATHX ve Türkiye öncelikli; koşudan yalnızca büyük yarışlar; yurt dışı kurs yok). Uygun haber yoksa hiçbir şey paylaşma, bitir.
5) `node manual/fetch.mjs <url1> [url2]` ile kaynak metni ve fotoğrafları al. Metni oku; postu YALNIZCA bu metindeki bilgilerle yaz. Fotoğraflara Read ile bak; haberin kendi etkinliğine/sporcusuna ait, net, uygun fotoğrafı seç. Uygun fotoğraf yoksa o haberi atla.
6) `manual/work/posts.json` yaz. publishAt: ilk post için şimdiki TR saatinden 10 dk sonrası, ikinci post için 1 saat sonrası ("YYYY-MM-DDTHH:MM", Europe/Istanbul). id benzersiz olsun.
7) `node manual/make.mjs` ile çiz, `out/manual/<id>/` slaytlarına bak (yazı taşması, yüz kesilmesi, yanlış rozet). Kendi doğrulamanı yap: posttaki her ad, tarih, sayı kaynak metinde geçiyor mu; kategori adı/fiyat/şapkalı harf var mı. Şüphe varsa o postu çıkar.
8) Geçenleri yükle ve sıraya al (bash): `GH_REPO=MMK-34/hibrit-insta GH_TOKEN=$(gh auth token) node manual/make.mjs --publish`, sonra `git add state/manual-queue.json && git commit -m "elle post: <başlıklar>" && git pull --rebase && git push`.
8b) BİLGİ POSTU (günde en çok 1): Bugün bilgi postu sıraya konmadıysa (cands çıktısında bugünkü "kind: bilgi" yoksa) ve günlük 5 sınırı aşılmıyorsa 1 bilgi postu da hazırla: HYROX istasyonları ve kuralları, CrossFit Open formatı, yarış öncesi beslenme/toparlanma gibi sporcuya yarayan kalıcı bir konu. Kaynak YALNIZCA resmî sayfa (hyrox.com, games.crossfit.com, organizatör sitesi) ya da yayımlanmış araştırma; `node manual/fetch.mjs <url>` ile metni al, yalnızca o metinden yaz. Kategori adı, ağırlık tablosu ve fiyat YOK. Son 40 başlıkta aynı konu varsa başka konu seç. Fotoğraf: `node manual/stock.mjs <kategori> "<ingilizce sorgu>"` ile stok adayları al, Read ile bak, konuya uyanı seç (posts.json photos içine "id" alanını da yaz). kind "bilgi", publishAt haber postlarından en az 1 saat sonra. CTA: "Yarış planın için kaydet."
9) Kısa Türkçe özet ver: hangi haberler, hangi saatte paylaşılacak.

Asla: ödeme yapma, Instagram'a doğrudan paylaşım yapma (yalnızca sıraya koy), token/şifre yazdırma, kural dışı içerik paylaşma.
