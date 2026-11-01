#!/bin/bash
# Joylashdan keyin frontend keshini to'liq yangilash (deploy/ papkasidan):
#
#   ./revalidate.sh
#
# Frontend image'i CI'da bo'sh bazadan yig'iladi — oldindan tayyorlangan sahifalar (bosh sahifa,
# kategoriyalar, sitemap) haqiqiy maʼlumot bilan shu buyruqdan keyin qayta tayyorlanadi.
# Biznes va mahsulot sahifalari build'da tayyorlanmaydi — ular birinchi so'rovda yangidan chiziladi.
set -euo pipefail

docker compose exec -T backend python -c "
import json, os, urllib.request
tags = ['businesses', 'categories', 'districts', 'settings']
request = urllib.request.Request(
    os.environ['FRONTEND_REVALIDATE_URL'],
    data=json.dumps({'tags': tags}).encode(),
    headers={'Authorization': 'Bearer ' + os.environ['REVALIDATE_SECRET'],
             'Content-Type': 'application/json'},
)
print(urllib.request.urlopen(request, timeout=10).read().decode())
"
