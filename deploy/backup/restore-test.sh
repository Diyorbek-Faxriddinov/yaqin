#!/bin/bash
# Tiklash sinovi: eng so'nggi zaxira alohida, vaqtinchalik baza konteyneriga tiklanadi va zaxira
# vaqtidagi qatorlar soni (counts.tsv), rasmlar soni va hajmi (media.txt) bilan solishtiriladi.
# Ishlab turgan sayt va bazaga tegmaydi. Natija Telegram'ga yuboriladi.
# systemd: yaqin-restore-test.timer (har oyning 1-kuni 05:00). Qo'lda: sudo ./restore-test.sh
set -Eeuo pipefail
# shellcheck source-path=SCRIPTDIR source=lib.sh
source "$(dirname "$0")/lib.sh"
require_root

trap 'notify "❌ Yaqin: tiklash sinovi muvaffaqiyatsiz ($(date "+%Y-%m-%d %H:%M")). Log: journalctl -u yaqin-restore-test"' ERR

restic_env
work=$(mktemp -d /var/tmp/yaqin-restore.XXXXXX)
container=yaqin-restore-test
cleanup() {
	docker rm -f "$container" >/dev/null 2>&1 || true
	rm -rf "$work"
}
trap cleanup EXIT

echo "==> Zaxirani tiklash (vaqtinchalik papkaga)"
snapshot=$(restic snapshots --host "$BACKUP_HOST" --latest 1 --json | python3 -c \
	'import json, sys; s = json.load(sys.stdin)[-1]; print(s["short_id"], s["time"][:16].replace("T", " "))')
restic restore latest --host "$BACKUP_HOST" --target "$work"
dump_dir=$work$DUMP_DIR
media_dir=$work$(media_path)

echo "==> Bazani vaqtinchalik konteynerga tiklash"
image=$(docker inspect -f '{{ .Config.Image }}' "$(compose ps -q db)")
docker run -d --name "$container" -e POSTGRES_PASSWORD="$(openssl rand -hex 16)" \
	-v "$dump_dir:/restore:ro" "$image" >/dev/null
# TCP orqali: init skriptlari vaqtida server faqat unix socket'da (compose healthcheck bilan bir xil)
for _ in $(seq 60); do
	docker exec "$container" pg_isready -q -h 127.0.0.1 -U postgres && break
	sleep 2
done
docker exec "$container" createdb -U postgres yaqin
docker exec "$container" pg_restore -U postgres -d yaqin --no-owner --no-privileges --exit-on-error \
	/restore/yaqin.dump
docker exec "$container" psql -U postgres -d yaqin -At -F $'\t' -c "$COUNTS_SQL" >"$work/counts.tsv"

echo "==> Solishtirish"
if ! diff -u "$dump_dir/counts.tsv" "$work/counts.tsv"; then
	echo "XATO: tiklangan bazadagi qatorlar soni zaxira vaqtidagidan farq qiladi" >&2
	false
fi
expected_media=$(cat "$dump_dir/media.txt")
restored_media=$(media_summary "$media_dir")
if [[ $expected_media != "$restored_media" ]]; then
	echo "XATO: rasmlar mos emas (kutilgan: $expected_media, tiklangan: $restored_media)" >&2
	false
fi

echo "==> Repozitoriy butunligi (ma'lumotning 5 foizi o'qiladi)"
restic check --read-data-subset=5%

tables=$(wc -l <"$work/counts.tsv")
rows=$(awk -F'\t' '{ s += $2 } END { print s + 0 }' "$work/counts.tsv")
notify "✅ Yaqin: tiklash sinovi o'tdi. Zaxira $snapshot: $tables jadval, $rows qator, rasmlar: ${restored_media% *} ta." ||
	true # sinov o'tdi; xabar yuborilmagani sinovni yiqitmasin
