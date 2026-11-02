#!/bin/bash
# Server ichidan monitoring (yaqin-healthcheck.timer, har 5 daqiqada): konteynerlar, disk,
# sertifikat muddati, oxirgi zaxira. Holat o'zgarganda — muammo paydo bo'lsa yoki tuzalsa —
# Telegram'ga bir marta xabar (har 5 daqiqada takrorlanmaydi). Server butunlay o'chsa bu skript
# ham ishlamaydi — buni tashqi monitoring (UptimeRobot) ushlaydi.
set -uo pipefail
# shellcheck source-path=SCRIPTDIR source=lib.sh
source "$(dirname "$0")/lib.sh"
require_root

DISK_LIMIT=85
CERT_DAYS=14
BACKUP_MAX_AGE=$((26 * 3600))
PC_COPY_MAX_AGE=$((10 * 86400))
problems=()

for service in db redis backend scheduler frontend caddy; do
	id=$(compose ps -q "$service" 2>/dev/null)
	if [[ -z $id ]]; then
		problems+=("konteyner $service ishlamayapti")
		continue
	fi
	read -r status health < <(docker inspect -f '{{ .State.Status }} {{ if .State.Health }}{{ .State.Health.Status }}{{ end }}' "$id")
	if [[ $status != running || ${health:-} == unhealthy ]]; then
		problems+=("konteyner $service: $status ${health:-}")
	fi
done

disk=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
((disk < DISK_LIMIT)) || problems+=("disk ${disk}% to'lgan")

domain=$(env_get SITE_DOMAIN)
if ! timeout 15 openssl s_client -connect 127.0.0.1:443 -servername "$domain" </dev/null 2>/dev/null |
	openssl x509 -noout -checkend $((CERT_DAYS * 86400)) >/dev/null 2>&1; then
	problems+=("sertifikat: $CERT_DAYS kundan kam qoldi yoki o'qib bo'lmadi")
fi

repository=$(env_get BACKUP_REPOSITORY)
if [[ -n $repository ]]; then
	stamp=$STATE_DIR/last-backup
	if [[ ! -f $stamp ]] || (($(date +%s) - $(stat -c %Y "$stamp") > BACKUP_MAX_AGE)); then
		problems+=("oxirgi muvaffaqiyatli zaxira 26 soatdan eski")
	fi
fi
# Zaxira faqat server diskida bo'lsa — yagona tashqi nusxa administrator kompyuterida
# (backup-copy.ps1 nusxadan keyin .env egasining uy papkasida belgi qoldiradi)
if [[ $repository == /* ]]; then
	owner_home=$(getent passwd "$(stat -c %U "$ENV_FILE")" | cut -d: -f6)
	stamp=$owner_home/.yaqin-pc-copy
	if [[ ! -f $stamp ]] || (($(date +%s) - $(stat -c %Y "$stamp") > PC_COPY_MAX_AGE)); then
		problems+=("kompyuterga zaxira nusxasi 10 kundan beri olinmagan (backup-copy.ps1)")
	fi
fi

install -d -m 700 "$STATE_DIR"
current=$(printf '%s\n' "${problems[@]}" | sed '/^$/d' | sort)
previous=$(cat "$STATE_DIR/health-state" 2>/dev/null || true)
if [[ $current != "$previous" ]]; then
	if [[ -n $current ]]; then
		notify "⚠️ Yaqin: muammo"$'\n'"• ${current//$'\n'/$'\n'• }"
	else
		notify "✅ Yaqin: muammolar tuzaldi, hammasi joyida"
	fi
	printf '%s' "$current" >"$STATE_DIR/health-state"
fi
[[ -z $current ]] && echo "Hammasi joyida" || echo "$current"
