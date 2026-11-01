#!/bin/bash
# Ishga tushgan production to'plamini tekshirish (CI va serverda joylashdan keyin), deploy/ papkasidan:
#
#   BASE=http://localhost ./smoke.sh      # CI
#   BASE=https://yaqinapp.uz ./smoke.sh   # server
#
# Maʼlumotlarni o'zgartirmaydi (vaqtinchalik sinov rasmi yaratilib, o'chiriladi).
set -uo pipefail

BASE=${BASE:?BASE kerak, masalan http://localhost}
failures=0

check() {
	local name=$1
	shift
	if "$@" >/dev/null 2>&1; then
		echo "✅ $name"
	else
		echo "❌ $name"
		failures=$((failures + 1))
	fi
}

# HTTP holat kodi kutilganiga tengmi: has_status 200 URL [curl parametrlari]
has_status() {
	local expected=$1
	shift
	[ "$(curl -s -o /dev/null -w '%{http_code}' "$@")" = "$expected" ]
}
# Javob sarlavhalarida (kichik harflarda) qolip bormi: has_header 'qolip' URL [curl parametrlari]
has_header() {
	local pattern=$1
	shift
	curl -s -o /dev/null -D - "$@" | tr -d '\r' | tr '[:upper:]' '[:lower:]' | grep -q "$pattern"
}
body_contains() { curl -sf "$2" | grep -q "$1"; }
in_backend() { docker compose exec -T backend "$@"; }

check "API health" body_contains '"status":"ok"' "$BASE/api/v1/health"
check "Bosh sahifa (uz)" body_contains 'Yaqin' "$BASE/"
check "Rus tili" has_status 200 "$BASE/ru"
check "Kategoriyalar sahifasi" has_status 200 "$BASE/kategoriyalar"
check "Admin kirish sahifasi" has_status 200 "$BASE/admin/kirish"
check "Kategoriyalar API" has_status 200 "$BASE/api/v1/categories?lang=uz"
check "robots.txt" has_status 200 "$BASE/robots.txt"
# Demo build robots.txt'da butun saytni yopadi; haqiqiy build — sitemap bilan (src/app/robots.ts).
# Sahifa HTML'idagi matn emas: tarjimalar paketida "Demo rejim" so'zi baribir bor
check "Demo rejim o'chiq" body_contains '^Sitemap:' "$BASE/robots.txt"
check "CSP sarlavhasi" has_header '^content-security-policy:' "$BASE/"
check "Server nomi yashirin" bash -c "! curl -s -o /dev/null -D - '$BASE/' | grep -qi '^x-powered-by:'"
check "Siqish (gzip)" has_header '^content-encoding: gzip' -H 'Accept-Encoding: gzip' "$BASE/"
check "Webhook tashqaridan yopiq" has_status 404 -X POST "$BASE/api/revalidate"
check "Mavjud bo'lmagan sahifa — 404" has_status 404 "$BASE/bunday-sahifa-yoq"

# Rasm: backend yozgan fayl — Caddy orqali (o'zgarmas kesh, nosniff) va Next.js optimizatori orqali
in_backend python -c "
import os
from PIL import Image
os.makedirs('media/smoke', exist_ok=True)
Image.new('RGB', (240, 240), (15, 118, 110)).save('media/smoke/test.webp', 'WEBP')
"
MEDIA="$BASE/api/v1/media/smoke/test.webp"
check "Rasm — Caddy'dan" has_status 200 "$MEDIA"
check "Rasm — o'zgarmas kesh" has_header '^cache-control: public, max-age=31536000, immutable' "$MEDIA"
check "Rasm — nosniff" has_header '^x-content-type-options: nosniff' "$MEDIA"
check "Rasm — optimizator (next/image)" has_status 200 \
	"$BASE/_next/image?url=%2Fapi%2Fv1%2Fmedia%2Fsmoke%2Ftest.webp&w=64&q=75"
check "Rasm — papkadan chiqib bo'lmaydi" bash -c \
	"[ \"\$(curl -s -o /dev/null -w '%{http_code}' --path-as-is '$BASE/api/v1/media/../../etc/passwd')\" != 200 ]"
in_backend rm -rf media/smoke

# Backend → frontend kesh yangilash webhook'i (ichki tarmoq)
check "Kesh yangilash webhook'i (ichki)" in_backend python -c "
import json, os, urllib.request
request = urllib.request.Request(
    os.environ['FRONTEND_REVALIDATE_URL'],
    data=json.dumps({'tags': ['settings']}).encode(),
    headers={'Authorization': 'Bearer ' + os.environ['REVALIDATE_SECRET'],
             'Content-Type': 'application/json'},
)
assert urllib.request.urlopen(request, timeout=10).status == 200
"
check "Django deploy tekshiruvi" in_backend python manage.py check --deploy --fail-level ERROR

if [ "$failures" -gt 0 ]; then
	echo "Muvaffaqiyatsiz: $failures"
	exit 1
fi
echo "Hammasi joyida"
