#!/bin/bash
# Zaxira va monitoringni o'rnatish (serverda, bir marta; qayta ishga tushirish xavfsiz):
#
#   sudo deploy/backup/install.sh
#
# - restic (Ubuntu repozitoriysidan — xavfsizlik yangilanishlari bilan keladi);
# - .env ga zaxira kalitlari qo'shiladi; BACKUP_PASSWORD bo'sh bo'lsa — yaratiladi
#   (⚠ administrator uni parol menejeriga saqlaydi: yo'qolsa, zaxiralarni ochib bo'lmaydi);
# - restic repozitoriysi bo'lmasa — yaratiladi. Lokal papka (BACKUP_REPOSITORY=/var/backups/restic —
#   S3 Toshkentda hali yo'q, 5.5) .env egasining guruhiga o'qishga ochiladi: kompyuterdagi nusxa
#   (scripts/local/backup-copy.ps1) uni SSH orqali, parolsiz va shifrlangan holda ko'chiradi;
# - systemd taymerlari: yaqin-backup (har kuni 03:00), yaqin-healthcheck (har 5 daqiqada),
#   yaqin-restore-test (har oyning 1-kuni 05:00).
set -euo pipefail
dir=$(cd "$(dirname "$0")" && pwd)
# shellcheck source-path=SCRIPTDIR source=lib.sh
source "$dir/lib.sh"
require_root

if ! command -v restic >/dev/null; then
	echo "==> restic"
	DEBIAN_FRONTEND=noninteractive apt-get install -y -qq restic >/dev/null
fi

echo "==> .env"
for key in BACKUP_REPOSITORY BACKUP_S3_ACCESS_KEY BACKUP_S3_SECRET_KEY BACKUP_S3_REGION BACKUP_PASSWORD ALERT_TELEGRAM_CHAT_ID; do
	grep -q "^$key=" "$ENV_FILE" || echo "$key=" >>"$ENV_FILE"
done
if [[ -z $(env_get BACKUP_PASSWORD) ]]; then
	sed -i "s|^BACKUP_PASSWORD=.*|BACKUP_PASSWORD=$(openssl rand -hex 32)|" "$ENV_FILE"
	echo "BACKUP_PASSWORD yaratildi — parol menejeringizga saqlang (yo'qolsa, zaxiralarni ochib bo'lmaydi)"
fi

echo "==> restic repozitoriysi"
restic_env
if restic cat config >/dev/null 2>&1; then
	echo "bor: $RESTIC_REPOSITORY"
else
	[[ $RESTIC_REPOSITORY != /* ]] || install -d -m 750 "$RESTIC_REPOSITORY"
	restic init
fi
if [[ $RESTIC_REPOSITORY == /* ]]; then
	# Guruh faqat o'qiydi. restic config fayli guruhga ochiq bo'lsa, yangi fayllarni ham shunday
	# yaratadi; setgid — yangi papka va fayllar shu guruhda qoladi
	group=$(stat -c %G "$ENV_FILE")
	chgrp -R "$group" "$RESTIC_REPOSITORY"
	chmod -R g+rX,g-w,o-rwx "$RESTIC_REPOSITORY"
	find "$RESTIC_REPOSITORY" -type d -exec chmod g+s {} +
	echo "o'qish huquqi: $group guruhi"
fi

echo "==> systemd"
unit() {
	local name=$1 description=$2 script=$3 schedule=$4
	cat >"/etc/systemd/system/$name.service" <<EOF
[Unit]
Description=$description
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
ExecStart=$dir/$script
Nice=10
IOSchedulingClass=idle
EOF
	cat >"/etc/systemd/system/$name.timer" <<EOF
[Unit]
Description=$description (taymer)

[Timer]
$schedule

[Install]
WantedBy=timers.target
EOF
}
unit yaqin-backup "Yaqin: kunlik zaxira (baza va rasmlar → S3)" backup.sh \
	$'OnCalendar=*-*-* 03:00:00\nRandomizedDelaySec=5min\nPersistent=true'
unit yaqin-healthcheck "Yaqin: monitoring (konteynerlar, disk, sertifikat, zaxira)" healthcheck.sh \
	$'OnBootSec=5min\nOnUnitActiveSec=5min'
unit yaqin-restore-test "Yaqin: oylik tiklash sinovi" restore-test.sh \
	$'OnCalendar=*-*-01 05:00:00\nPersistent=true'
systemctl daemon-reload
systemctl enable --now yaqin-backup.timer yaqin-healthcheck.timer yaqin-restore-test.timer
systemctl list-timers 'yaqin-*' --no-pager
