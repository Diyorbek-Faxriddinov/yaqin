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
# Javob avval o'zgaruvchiga olinadi, keyin tekshiriladi: `curl | grep -q` pipefail bilan
# vaqtga bog'liq yiqiladi (grep birinchi moslikda chiqadi → curl SIGPIPE, kod 23)
headers_of() { curl -s -o /dev/null -D - "$@" | tr -d '\r' | tr '[:upper:]' '[:lower:]'; }
# Javob sarlavhalarida (kichik harflarda) qolip bormi: has_header 'qolip' URL [curl parametrlari]
has_header() {
	local pattern=$1 headers
	shift
	headers=$(headers_of "$@") && grep -q "$pattern" <<<"$headers"
}
lacks_header() {
	local pattern=$1 headers
	shift
	headers=$(headers_of "$@") && ! grep -q "$pattern" <<<"$headers"
}
body_contains() {
	local body
	body=$(curl -sf "$2") && grep -q "$1" <<<"$body"
}
in_backend() { docker compose exec -T backend "$@"; }
# Frontend'ning o'z javobi (Caddy'siz): in_frontend_body 'regex' /yo'l
in_frontend_body() {
	docker compose exec -T frontend node -e "
fetch('http://127.0.0.1:3000' + process.argv[2]).then((r) => r.text())
  .then((t) => process.exit(new RegExp(process.argv[1], 'm').test(t) ? 0 : 1), () => process.exit(1))
" "$1" "$2"
}

# Indekslash holati — .env dagi SITE_INDEXING (Caddyfile): "open" bo'lmaguncha yopiq
INDEXING=${SITE_INDEXING:-$(sed -n 's/^SITE_INDEXING=//p' .env 2>/dev/null)}
[ "$INDEXING" = open ] || INDEXING=closed

check "API health" body_contains '"status":"ok"' "$BASE/api/v1/health"
check "Bosh sahifa (uz)" body_contains 'Yaqin' "$BASE/"
check "Rus tili" has_status 200 "$BASE/ru"
check "Kategoriyalar sahifasi" has_status 200 "$BASE/kategoriyalar"
check "Admin kirish sahifasi" has_status 200 "$BASE/admin/kirish"
check "Kategoriyalar API" has_status 200 "$BASE/api/v1/categories?lang=uz"
check "robots.txt" has_status 200 "$BASE/robots.txt"
# Demo build robots.txt'da butun saytni yopadi; haqiqiy build — sitemap bilan (src/app/robots.ts).
# Frontend'ning o'zidan so'raladi: tashqarida robots.txt'ni indekslash holati belgilaydi. Sahifa
# HTML'idagi matn emas: tarjimalar paketida "Demo rejim" so'zi baribir bor
check "Demo rejim o'chiq" in_frontend_body '^Sitemap:' /robots.txt
if [ "$INDEXING" = closed ]; then
	check "Indekslash yopiq — robots.txt" body_contains '^Disallow: /$' "$BASE/robots.txt"
	check "Indekslash yopiq — X-Robots-Tag" has_header '^x-robots-tag: noindex' "$BASE/"
else
	check "Indekslash ochiq — robots.txt" body_contains '^Sitemap:' "$BASE/robots.txt"
	check "Indekslash ochiq — X-Robots-Tag yo'q" lacks_header '^x-robots-tag:' "$BASE/"
fi
check "CSP sarlavhasi" has_header '^content-security-policy:' "$BASE/"
check "Server nomi yashirin" lacks_header '^x-powered-by:' "$BASE/"
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
