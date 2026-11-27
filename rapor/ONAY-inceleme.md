# ONAY Vekalet Farkı İncelemesi (claude/onay-vekalet)
- Mantık: `src/run.mjs:997` koşulu (`imza && !işaret`) doğru; işaretsiz Claude imzalı yorumlar hâlâ eleniyor, işaretli `ONAY`/`RET` geçiyor.
- İlk satır şartı: `first` alıntısız ilk satırı (`^(ONAY|RET)\s+([sr][0-9a-f]{8})$`) okuduğundan 2. satırdaki `[kullanıcı kararı · sohbet]` komutu bozmuyor.
- Sahip süzgeci: `owner`, `type === "User"` ve `!performed_via_github_app` ile issue süzgeci eksiksiz korunmuş.
- AGENTS.md: Yetki, biçim ve yasaklar açık; küçük not olarak metin "videoyu" derken kod `s...` (post) kodlarını da kapsıyor.
- Ek not: İşaret `·` (U+00B7) karakterine duyarlı ve gövdede satır bağımsız aranıyor; kabul edilen risk dışında ek açık yok.
Karar: Onay
