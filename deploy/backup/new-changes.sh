#!/bin/bash
# Biznes egalarining yangi takliflari haqida Telegram xabari (yaqin-changes.timer, har 5 daqiqada,
# ADR-0015). Yuboriladi: biznes nomi, taklif turi va "muhim" belgisi. Egasi yozgan matn, ismi va
# aloqa maʼlumotlari yuborilmaydi — ular admin panelda (/admin/takliflar). Xabar yuborilmasa,
# keyingi safar qayta urinadi. Tekshiruvgacha almashtirilgan taklif alohida xabar bermaydi.
set -Eeuo pipefail
# shellcheck source-path=SCRIPTDIR source=lib.sh
source "$(dirname "$0")/lib.sh"
require_root

LIMIT=10
install -d -m 700 "$STATE_DIR"
state=$STATE_DIR/changes-since
since=$(cat "$state" 2>/dev/null || echo "-infinity")

rows=$(compose exec -T db psql -U postgres -d yaqin -At -F $'\t' -v ON_ERROR_STOP=1 -v since="$since" <<'SQL'
SELECT to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
       b.name, c.kind, c.important::int
FROM cabinet_businesschange c
JOIN businesses_business b ON b.id = c.business_id
WHERE c.status = 'pending' AND c.created_at > :'since'::timestamptz
ORDER BY c.created_at
SQL
)
[[ -n $rows ]] || exit 0

count=$(wc -l <<<"$rows")
lines=$(head -n "$LIMIT" <<<"$rows" | awk -F'\t' '
BEGIN {
	kind["profile"] = "biznes maʼlumotlari"
	kind["item.create"] = "yangi mahsulot"
	kind["item.update"] = "mahsulot oʻzgarishi"
	kind["item.delete"] = "mahsulotni oʻchirish"
	kind["photos"] = "biznes rasmlari"
}
{
	line = "• " $2 " — " kind[$3]
	if ($4 == "1") line = line " (muhim)"
	print line
}')
((count <= LIMIT)) || lines+=$'\n'"• … yana $((count - LIMIT)) ta"
admin_url="$(env_get SITE_URL)/admin/takliflar"

if notify "📝 Yaqin: egalardan yangi taklif ($count)"$'\n'"$lines"$'\n\n'"Koʻrish: $admin_url"; then
	tail -n 1 <<<"$rows" | cut -f1 >"$state"
fi
