Türkçe konuş. Görev: @hibritportal Instagram haber hesabı için, Anthropic API kredisi yokken postu SEN (Claude Code) hazırla; paylaşımı bulut bot yapar.

Çalışma klasörü: C:\Users\Mehmet Kuyucu\Desktop\cf\insta (git deposu MMK-34/hibrit-insta, dal main). Önce `git pull --rebase`.

1) `node -e "console.log(JSON.stringify(require('./state/posted.json').paused||null))"` çalıştır. Çıktı null ise (bot API ile kendisi çalışıyor) HİÇBİR ŞEY YAPMADAN "bot çalışıyor, elle post gerekmez" de ve bitir.
2) `manual/README.md` dosyasını baştan sona oku: akış, kesin kurallar ve posts.json biçimi oradadır. Kurallara harfiyen uy.
3) `node manual/cands.mjs` ile adayları, bugün paylaşılan post sayısını, son 40 başlığı ve hazır post sırasını gör. Bugün paylaşılan + sırada bugüne planlı toplam 10 veya fazlaysa bitir.
3b) Ek kaynaklar (az istek, Meta saatlik istek sınırı paylaşımla ortak): `node manual/recent-tr.mjs` ile 9 Türkiye hesabının son 36 saatteki paylaşımlarına bak (TÜM izlenen hesapları tarama). Kullanıcının @1mehmetkuyucu'dan DM ile attığı linkler de aday: `node manual/dm.mjs` ile oku (paylaş ile atılanlar okunamaz, link ile atılanlar okunur).
4) Kurallara uyan, daha önce paylaşılmamış, son 48 saatteki en değerli EN ÇOK 3 haberi seç (her biri TÜRKİYE TESTİ'nden geçmeli: Türkiye'de sporla ilgilenen biri bunu görmek ister mi?) (CrossFit/HYROX/ATHX ve Türkiye öncelikli; koşudan yalnızca büyük yarışlar; yurt dışı kurs yok). Uygun haber yoksa hiçbir şey paylaşma, bitir.
5) `node manual/fetch.mjs <url1> [url2]` ile kaynak metni ve fotoğrafları al. Metni oku; postu YALNIZCA bu metindeki bilgilerle yaz. Fotoğraflara Read ile bak; haberin kendi etkinliğine/sporcusuna ait, net, uygun fotoğrafı seç. Uygun fotoğraf yoksa o haberi atla.
6) `manual/work/posts.json` yaz. publishAt: HIZ kuralı (kullanıcı, 2026-11-14): haber beklemez; tüm haberlerde şimdiki TR saati (07:00-22:30 arası; dışındaysa ertesi gün 07:30) ("YYYY-MM-DDTHH:MM", Europe/Istanbul). id benzersiz olsun.
7) `node manual/make.mjs` ile çiz, `out/manual/<id>/` slaytlarına bak (yazı taşması, yüz kesilmesi, yanlış rozet). Kendi doğrulamanı yap: posttaki her ad, tarih, sayı kaynak metinde geçiyor mu; kategori adı/fiyat/şapkalı harf var mı. Şüphe varsa o postu çıkar. DOĞRULUK: her bilgi en az bir güvenilir kaynakta (resmî site, organizatörün resmî hesabı, federasyon, ulusal basın) geçmeli; haberin tarihi bugün/dün olmalı (eski haberi yeni gibi verme); yıl belirsizse takvimden doğrula.
7b) ÖZ DENETİM (kullanıcı kuralı 2026-11-22: "bu tarz hatalar yapma, kendin denetim yap"). Sıraya koymadan önce HER madde kontrol edilir; biri bile geçmezse post düzeltilir ya da çıkarılır:
   - Kaynağın tüm varyantları okundu mu? Antrenman, kural ya da ağırlık kategoriye göre değişiyorsa (Elite, Advanced, Scaled, Master, takım) hepsine bakıldı, fark varsa postta yazıldı. Tek kategoriye bakıp genelleme YOK.
   - Posttaki her ad, tarih, saat, sayı ve hareket kaynakta birebir geçiyor mu? Yabancı saat Türkiye saatine çevrildi mi?
   - Her slaytın fotoğrafı o slaytın konusuna uyuyor mu (kürek slaytında kürek, baş üstü slaytında baş üstü)? Fotoğraf/video anlatılan olayın KENDİSİNDEN mi? (kullanıcı kuralı 2026-11-22, kesin: belirli bir olay anlatılıyorsa yalnızca o olayın görüntüleri; stok ya da başka olayın görüntüsü YOK. Stok yalnızca olaya bağlı olmayan bilgi postunda.)
   - Kapaktaki logo bu etkinliğe mi ait? Fotoğrafta başka marka, kulüp, salon ya da yarış adı (forma, göğüs numarası, tabela) okunuyor mu? Okunuyorsa fotoğrafı değiştir.
   - Son 7 günde aynı haber ya da aynı etkinlik paylaşıldı mı (state/posted.json başlıkları ve IG)? Paylaşıldıysa çıkar.
   - Türkiye testi: Türkiye'de yaşayan biri katılabilir ya da gidebilir mi, ya da Türk sporcu var mı? Koşuda yalnızca yarış, tarih, yer, kayıt.
   - Tüm slaytları tek tek gör: taşma, kesik yüz, yanlış rozet, kategori adı, fiyat, şapkalı harf.
   - Bot kodunda değişiklik yaptıysan son günlerin gerçek postlarıyla tekrar oynatıp sonucu kontrol et, sonra gönder.
8) Geçenleri yükle ve sıraya al (bash): `GH_REPO=MMK-34/hibrit-insta GH_TOKEN=$(gh auth token) node manual/make.mjs --publish`, sonra `git add state/manual-queue.json && git commit -m "elle post: <başlıklar>" && git pull --rebase && git push`, ardından HIZ kuralı için `gh workflow run post.yml` ile botu hemen çalıştır (bot çalışma başına zamanı gelmiş en çok 3 postu atar).
8b) BİLGİ POSTU (günde en çok 1): Bugün bilgi postu sıraya konmadıysa (cands çıktısında bugünkü "kind: bilgi" yoksa) ve günlük 10 sınırı aşılmıyorsa 1 bilgi postu da hazırla: HYROX istasyonları ve kuralları, CrossFit Open formatı, yarış öncesi beslenme/toparlanma gibi sporcuya yarayan kalıcı bir konu. Kaynak YALNIZCA resmî sayfa (hyrox.com, games.crossfit.com, organizatör sitesi) ya da yayımlanmış araştırma; `node manual/fetch.mjs <url>` ile metni al, yalnızca o metinden yaz. Kategori adı, ağırlık tablosu ve fiyat YOK. Son 40 başlıkta aynı konu varsa başka konu seç. Fotoğraf: `node manual/stock.mjs <kategori> "<ingilizce sorgu>"` ile stok adayları al, Read ile bak, konuya uyanı seç (posts.json photos içine "id" alanını da yaz). kind "bilgi", publishAt haber postlarından en az 1 saat sonra. CTA: "Yarış planın için kaydet."
9) Kısa Türkçe özet ver: hangi haberler, hangi saatte paylaşılacak.

Asla: ödeme yapma, Instagram'a doğrudan paylaşım yapma (yalnızca sıraya koy), token/şifre yazdırma, kural dışı içerik paylaşma.

ANLATIMLI VİDEO KONU HAVUZU: manual/konu-havuzu.md (doğrulanmamış adaylar; her olgu iki bağımsız kaynakla doğrulanmadan önerilmez).
