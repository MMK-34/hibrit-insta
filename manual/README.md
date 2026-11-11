# Elle (Claude Code) haber postu hazırlama

API kredisi yokken ya da bot duraklatılmışken postlar Claude Code oturumunda hazırlanır, `state/manual-queue.json` sırasına konur.
Bulut bot (post.yml, saatte bir) sırası gelen postu Claude API çağırmadan paylaşır.

## Akış
1. `node manual/cands.mjs` → aday haberler + bugün paylaşılanlar + son 40 başlık + sıra.
2. 1-2 haber seç (kurallar aşağıda). `node manual/fetch.mjs <url> ...` → `manual/work/s{k}.txt` metin, `i{k}-{n}.jpg` fotoğraflar.
3. Metni oku. Postu YALNIZCA bu metindeki bilgilerle yaz. Fotoğraflara bak (Read), haberin kendi fotoğrafını seç.
4. `manual/work/posts.json` yaz (biçim aşağıda), `node manual/make.mjs` → `out/manual/<id>/` çizimler; görsellere bak.
5. Doğrulama: her ad/tarih/sayı kaynak metinde geçiyor mu; kural ihlali var mı. Sorun yoksa:
   `GH_REPO=MMK-34/hibrit-insta GH_TOKEN=$(gh auth token) node manual/make.mjs --publish`
6. `git add state/manual-queue.json && git commit -m "..." && git pull --rebase && git push`

## Kurallar (kullanıcının kesin kuralları)
- Odak: CrossFit, HYROX, ATHX, hibrit fitness; Türkiye'deki yarışlar ve Türk sporcular öncelikli. Dünyadaki büyük CrossFit/HYROX yarışları da haberdir.
- ATHX: yurt dışındaki ATHX yarışları paylaşılmaz; yalnızca Türkiye'de olursa (kullanıcı kararı, 2026-11-10).
- Koşu: yalnızca büyük/popüler yarışlar (İstanbul Maratonu, Runtalya, Mersin/Antalya/İzmir maratonları, Kapadokya, Kaçkar, Uludağ, Likya, Bodrum, maraton majorları) ve olağanüstü rekorlar. Belediye/halk koşuları ve küçük yerel koşular YOK.
- Kurslar (CrossFit L1/L2, HYROX antrenör vb.) YALNIZCA Türkiye'de olduğunda.
- Salonlar: yalnızca Wolf Haven; salon içi yarışmalar yok.
- Yarış kategorisi/divizyon adı ASLA yazılmaz (Beginner, Scaled, RX, Elite, Masters, Pro, Doubles...). Ücret/fiyat yazılmaz. Şapkalı harf yok (hala, resmi).
- Yalnızca kaynak metinde olan bilgi; tahmin, yorum, abartı, övgü sıfatı yok. Haber kanalı dili, en fazla 1 ünlem.
- Kişi adı: yalnızca haberin kendisi olan sporcu(lar) ve sonuç sıralaması.
- BAŞLIK (kullanıcı kuralı 2026-11-11): Kapak başlığında ve caption'ın ilk satırında yabancı sporcu adı YAZILMAZ; branş ve olay yazılır ("Yarı maratonda yeni dünya rekoru onaylandı", "HYROX Birmingham'da kadınlarda kazanan belli oldu"). Ad ayrıntı slaytında ve caption gövdesinde geçer. İstisna: Türk sporcular.
- Fotoğraf: etkinlik haberinde o etkinliğin kendi fotoğrafı; sporcu haberinde o sporcunun fotoğrafı; ilgisiz fotoğraf yok. Son 10 postta kullanılan fotoğraf tekrar yok. Marka belirgin görünüyorsa caption'a "Reklam / Tanıtım" satırı.
- Günde en çok 5 post (bot + elle toplam); bunların en çok 1'i bilgi postu (kalıcı konu, resmî kaynaktan). Bilgi postunda konuya uygun stok fotoğraf kullanılabilir (`node manual/stock.mjs`); haberde kullanılmaz. Aynı haberi tekrar etme (son 40 başlığa bak).
- Caption: 1. satır haberin kendisi (≤70 karakter); 2. satır bağlam; 2-4 kısa paragraf; habere özgü tek soru; tek çağrı cümlesi
  (duyuru: "Birlikte yarışmak istediğin arkadaşına gönder." / bilgi: "Yarış planın için kaydet." / sonuç: "Bu yarışta tanıdığın biri var mı? Ona gönder.").
  Link, URL, @kullanıcı adı yok; "Kaynak:" satırını yazma (sistem ekler).
- Karoselde her slaytın fotoğrafı farklı ve konuyla ilgili olmalı (kullanıcı kuralı 2026-11-11): kapakta etkinliğin/sporcunun kendi fotoğrafı, sonra aynı etkinliğin diğer fotoğrafları (kaynak sayfa, organizatörün Instagram'ı). Yazılı afiş, ilgisiz stok (başka spor, bale vb.) KULLANMA; yetmezse kalan slaytlar fotoğrafsız kalır (posts.json photos sırası = slayt sırası). Tekrar eden fotoğraf yasak.
- Konum rozeti: `country` (Türkçe ülke) ve `place` (il/şehir).

## posts.json biçimi
```json
[{ "id": "kisa-benzersiz-id", "publishAt": "2026-11-10T14:30", "kind": "haber|duyuru", "category": "crossfit|hyrox|kosu|fonksiyonel|doga|bisiklet|yaris",
   "sourceName": "Yayıncı adı", "srcUrl": "https://...", "photos": [{ "file": "i0-0.jpg", "credit": "site.com" }],
   "post": { "eventName": "", "country": "Türkiye", "place": "İstanbul", "athleteName": "",
     "slides": [{ "type": "cover", "kicker": "", "title": "", "subtitle": "" }, { "type": "text", "title": "", "bullets": ["", ""] },
                { "type": "stat", "label": "", "value": "" }, { "type": "end", "title": "habere özgü soru" }],
     "caption": "...", "hashtags": ["#...", "#hibritportal"] } }]
```
Slayt sınırları: başlık 100, madde 125, gövde 240, stat değeri 10 karakter. 3-5 slayt.
