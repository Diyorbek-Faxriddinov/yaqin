#!/bin/bash
# .env dagi maxfiy qiymatni yozish (qiymat ekranga ham, buyruqlar tarixiga ham chiqmaydi):
#
#   Get-Clipboard | ssh yaqin yaqin/deploy/set-secret.sh TELEGRAM_BOT_TOKEN  # kompyuter buferidan (PowerShell)
#   ssh -t yaqin yaqin/deploy/set-secret.sh TELEGRAM_BOT_TOKEN               # yashirin so'raydi
#
# Bufer usuli ishonchliroq: yashirin so'rovga nusxa qo'yilgani ko'rinmaydi (2026-11-02 da shu
# sabab ikki marta bo'sh yoki ortiqcha matn kiritilgan). BotFather xabari to'liq nusxalansa ham bo'ladi.
set -euo pipefail
key=${1:?Kalit nomi kerak, masalan: ./set-secret.sh TELEGRAM_BOT_TOKEN}
env_file="$(dirname "$0")/.env"
grep -q "^$key=" "$env_file" || { echo "XATO: $key .env da yo'q"; exit 1; }
if [ -t 0 ]; then
  read -rsp "$key (yozilgani ko'rinmaydi, Enter): " raw || true
  echo
else
  raw=$(cat)
fi
raw=$(printf '%s' "$raw" | tr -d '\r')
if [ "$key" = TELEGRAM_BOT_TOKEN ]; then
  # BotFather xabari to'liq nusxalangan bo'lsa ham — ichidan token ajratiladi
  value=$(grep -m1 -oE '[0-9]{5,}:[A-Za-z0-9_-]{30,}' <<<"$raw" || true)
  [ -n "$value" ] || {
    echo "XATO: token topilmadi (kiritildi: ${#raw} belgi, ':' bor: $([[ $raw == *:* ]] && echo ha || echo yo\'q)) — o'zgartirilmadi"
    exit 1
  }
else
  value=$(printf '%s' "$raw" | tr -d ' \t\n')
  [ -n "$value" ] || { echo "Bo'sh — o'zgartirilmadi"; exit 1; }
fi
[[ $value != *[\|\&\]* ]] || { echo "XATO: | & \ belgilari qabul qilinmaydi"; exit 1; }
sed -i "s|^$key=.*|$key=$value|" "$env_file"
echo "Saqlandi: $key (${#value} belgi)"
