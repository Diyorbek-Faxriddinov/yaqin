# Zaxira va monitoring skriptlari uchun umumiy qism (source qilinadi). Batafsil: docs/deployment.md
# shellcheck shell=bash disable=SC2034 # o'zgaruvchilar shu faylni source qilgan skriptlarda ishlatiladi

DEPLOY_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE=$DEPLOY_DIR/.env
STATE_DIR=/var/lib/yaqin
DUMP_DIR=/var/backups/yaqin
MEDIA_VOLUME=yaqin_media
# restic snapshot'lari shu nom bilan: server qayta yaratilsa ham bir xil (hostname'ga bog'liq emas)
BACKUP_HOST=yaqin

# Har bir jadvaldagi qatorlar soni — zaxira vaqtida yoziladi, tiklash sinovi solishtiradi
COUNTS_SQL="SELECT table_name, (xpath('/row/c/text()', query_to_xml(
  format('SELECT count(*) AS c FROM public.%I', table_name), false, true, '')))[1]::text
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1"

require_root() {
	[[ $EUID -eq 0 ]] || {
		echo "XATO: root sifatida ishga tushiring (sudo)" >&2
		exit 1
	}
}

# .env dagi bitta qiymat. Fayl source qilinmaydi: SITE_ADDRESS kabi qiymatlarda bo'sh joy bor
env_get() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1; }

compose() { docker compose --project-directory "$DEPLOY_DIR" "$@"; }

restic_env() {
	export RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION
	RESTIC_REPOSITORY=$(env_get BACKUP_REPOSITORY)
	RESTIC_PASSWORD=$(env_get BACKUP_PASSWORD)
	AWS_ACCESS_KEY_ID=$(env_get BACKUP_S3_ACCESS_KEY)
	AWS_SECRET_ACCESS_KEY=$(env_get BACKUP_S3_SECRET_KEY)
	AWS_DEFAULT_REGION=$(env_get BACKUP_S3_REGION)
	if [[ -z $RESTIC_REPOSITORY || -z $RESTIC_PASSWORD ]]; then
		echo "XATO: .env da BACKUP_REPOSITORY yoki BACKUP_PASSWORD yo'q" >&2
		return 1
	fi
}

media_path() { docker volume inspect -f '{{ .Mountpoint }}' "$MEDIA_VOLUME"; }

# Rasmlar: fayllar soni va umumiy hajmi (baytda) — "N BAYT"
media_summary() {
	find "$1" -type f -printf '%s\n' | awk '{ n++; s += $1 } END { printf "%d %d\n", n, s }'
}

# Administratorga Telegram xabari (bot tokeni va ALERT_TELEGRAM_CHAT_ID bo'lmasa — faqat log)
notify() {
	local token chat
	echo "$1"
	token=$(env_get TELEGRAM_BOT_TOKEN)
	chat=$(env_get ALERT_TELEGRAM_CHAT_ID)
	[[ -n $token && -n $chat ]] || return 0
	curl -fsS --max-time 15 -o /dev/null "https://api.telegram.org/bot$token/sendMessage" \
		--data-urlencode "chat_id=$chat" --data-urlencode "text=$1" ||
		echo "Telegram xabari yuborilmadi" >&2
}
