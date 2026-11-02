#!/bin/bash
# Yangi "Biznesingizni qo'shing" so'rovlari haqida Telegram xabari (yaqin-requests.timer, har 5 daqiqada).
# Shaxsiy maʼlumot (ism, telefon) Telegram'ga yuborilmaydi — faqat biznes nomi, faoliyati va tumani;
# qolgani admin panelda (/admin/sorovlar). Birinchi ishga tushishda — ko'rib chiqilmagan barcha so'rovlar.
# Xabar yuborilmasa, keyingi safar qayta urinadi.
set -Eeuo pipefail
# shellcheck source-path=SCRIPTDIR source=lib.sh
source "$(dirname "$0")/lib.sh"
require_root

LIMIT=10
install -d -m 700 "$STATE_DIR"
state=$STATE_DIR/requests-since
since=$(cat "$state" 2>/dev/null || echo "-infinity")

rows=$(compose exec -T db psql -U postgres -d yaqin -At -F $'\t' -v ON_ERROR_STOP=1 -v since="$since" <<'SQL'
SELECT to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
       r.business_name, r.activity, coalesce(d.name_uz, '')
FROM businesses_businessrequest r
LEFT JOIN catalog_district d ON d.id = r.district_id
WHERE r.status = 'new' AND r.created_at > :'since'::timestamptz
ORDER BY r.created_at
SQL
)
[[ -n $rows ]] || exit 0

count=$(wc -l <<<"$rows")
lines=$(head -n "$LIMIT" <<<"$rows" | awk -F'\t' '{
	line = "• " $2
	if ($3 != "") line = line " — " $3
	if ($4 != "") line = line " (" $4 ")"
	print line
}')
((count <= LIMIT)) || lines+=$'\n'"• … yana $((count - LIMIT)) ta"
admin_url="$(env_get SITE_URL)/admin/sorovlar"

if notify "📥 Yaqin: yangi biznes so'rovi ($count)"$'\n'"$lines"$'\n\n'"Koʻrish: $admin_url"; then
	tail -n 1 <<<"$rows" | cut -f1 >"$state"
fi
