#!/bin/bash
# Kunlik zaxira: baza (pg_dump) va yuklangan rasmlar → restic (serverda shifrlanadi) → S3 (Toshkent).
# systemd: yaqin-backup.timer, har kuni 03:00 (install.sh o'rnatadi). Qo'lda: sudo ./backup.sh
#
# Zaxira ichida (/var/backups/yaqin): yaqin.dump (pg_dump -Fc), counts.tsv (har jadvaldagi qatorlar
# soni) va media.txt (rasmlar soni va hajmi) — tiklash sinovi shular bilan solishtiradi; rasmlar
# volume'i. Saqlanadi: 7 kunlik, 4 haftalik, 6 oylik.
set -Eeuo pipefail
# shellcheck source-path=SCRIPTDIR source=lib.sh
source "$(dirname "$0")/lib.sh"
require_root

trap 'notify "❌ Yaqin: zaxira muvaffaqiyatsiz ($(date "+%Y-%m-%d %H:%M")). Log: journalctl -u yaqin-backup"' ERR

restic_env
install -d -m 700 "$DUMP_DIR" "$STATE_DIR"

echo "==> Baza"
compose exec -T db pg_dump -U postgres -d yaqin -Fc >"$DUMP_DIR/yaqin.dump.tmp"
mv "$DUMP_DIR/yaqin.dump.tmp" "$DUMP_DIR/yaqin.dump"
compose exec -T db psql -U postgres -d yaqin -At -F $'\t' -c "$COUNTS_SQL" >"$DUMP_DIR/counts.tsv"

echo "==> Rasmlar"
media=$(media_path)
media_summary "$media" >"$DUMP_DIR/media.txt"

echo "==> restic"
restic backup --host "$BACKUP_HOST" --tag daily --one-file-system "$DUMP_DIR" "$media"
restic forget --host "$BACKUP_HOST" --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

touch "$STATE_DIR/last-backup"
echo "Zaxira tayyor: $(wc -l <"$DUMP_DIR/counts.tsv") jadval, rasmlar: $(cat "$DUMP_DIR/media.txt")"
