#!/usr/bin/env bash
# media dalı temizliği: KEEP_DAYS günden eski "YYYY-MM-DD" klasörlerini siler ve kalan ağacı
# geçmişsiz tek (orphan) commit olarak media dalına zorla gönderir; eski görseller repo geçmişinden de düşer.
# Instagram görseli paylaşım anında kopyalar; site yalnız state/posted.json'daki (son 60 gün) kapakları okur.
# MEDIA.md, _brand/, _test/ gibi tarih adlı olmayan her şey olduğu gibi kalır.
#
# Kullanım (media dalının checkout'u içinden çalıştırılır):
#   KEEP_DAYS=90 DRY_RUN=1 bash ../tools/scripts/prune-media.sh   # sadece neyin silineceğini yazar
#   KEEP_DAYS=90 bash ../tools/scripts/prune-media.sh             # siler, tek commit'e indirir, push eder
set -euo pipefail

BRANCH="media"
KEEP_DAYS="${KEEP_DAYS:-90}"
DRY_RUN="${DRY_RUN:-0}"
MIN_KEEP=60   # posted.json 60 günü tutar: sitenin okuduğu kapaklar asla silinmesin

if ! [[ "$KEEP_DAYS" =~ ^[0-9]+$ ]] || (( 10#$KEEP_DAYS < MIN_KEEP )); then
  echo "Reddedildi: KEEP_DAYS geçersiz ($KEEP_DAYS); en az $MIN_KEEP olmalı" >&2
  exit 1
fi
KEEP_DAYS=$((10#$KEEP_DAYS))

# Güvenlik: yalnız media dalının checkout'unda çalış, başka dala asla dokunma
cur="$(git symbolic-ref --short -q HEAD || true)"
if [[ "$cur" != "$BRANCH" ]]; then
  echo "Reddedildi: geçerli dal '$BRANCH' değil (şu an: '${cur:-ayrık HEAD}')" >&2
  exit 1
fi
cd "$(git rev-parse --show-toplevel)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Reddedildi: çalışma ağacı temiz değil (commit'lenmemiş veya izlenmeyen dosya var)" >&2
  exit 1
fi

ORIG="$(git rev-parse HEAD)"
CUTOFF="$(date -u -d "-${KEEP_DAYS} days" +%F)"
echo "Kesim tarihi (UTC): $CUTOFF; son $KEEP_DAYS günün klasörleri kalır"

# Kökteki tarih klasörlerinden kesimden eski olanlar (sayı olarak karşılaştır: yerel ayar sıralamasından bağımsız)
OLD=()
while IFS= read -r d; do
  if [[ "$d" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && (( 10#${d//-/} < 10#${CUTOFF//-/} )); then
    OLD+=("$d")
  fi
done < <(git ls-tree -d --name-only HEAD)

if (( ${#OLD[@]} == 0 )); then
  echo "Silinecek klasör yok; işlem yapılmadı."
  exit 0
fi

total=0
for d in "${OLD[@]}"; do
  n=$(( $(git ls-tree -r --name-only HEAD -- "$d" | wc -l) ))
  total=$((total + n))
  echo "  sil: $d/ ($n dosya)"
done
echo "Toplam: ${#OLD[@]} klasör, $total dosya"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY_RUN=1: hiçbir şey değiştirilmedi."
  exit 0
fi

if git show-ref --verify --quiet refs/heads/tmp; then
  echo "Reddedildi: yerelde 'tmp' dalı zaten var" >&2
  exit 1
fi

git config user.name "hibrit-bot"
git config user.email "hibrit-bot@users.noreply.github.com"

git rm -r -q -- "${OLD[@]}"
git checkout -q --orphan tmp
git add -A
git commit -q -m "media: son ${KEEP_DAYS} gün (prune)"

# Doğrulama: yeni ağaç = eski ağaç eksi silinen klasörler; başka hiçbir dosya değişmemiş olmalı
pattern="^($(IFS='|'; echo "${OLD[*]}"))/"
unexpected="$(git diff --no-renames --name-only "$ORIG" HEAD | grep -Ev "$pattern" || true)"
if [[ -n "$unexpected" ]]; then
  echo "Durduruldu (push yapılmadı): beklenmeyen değişiklik var:" >&2
  echo "$unexpected" >&2
  exit 1
fi

# Lease: başlangıçtan beri media'ya yeni yükleme geldiyse push reddedilir, hiçbir şey kaybolmaz
git push --force-with-lease="refs/heads/$BRANCH:$ORIG" origin "tmp:refs/heads/$BRANCH"

git checkout -q -B "$BRANCH"
git branch -q -D tmp
echo "Tamam: $BRANCH tek commit'e indi ($(git rev-parse --short HEAD)); ${#OLD[@]} klasör, $total dosya silindi."
