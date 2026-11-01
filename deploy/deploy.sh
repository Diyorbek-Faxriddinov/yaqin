#!/bin/bash
# Joylash va yangilash (serverda, deploy/ papkasidan):
#
#   ./deploy.sh <commit>
#
# <commit> — Release workflow'i bergan qisqa commit (GitHub → Actions → Release → natija sahifasi).
# Repo shu commit'ga o'tkaziladi (compose, Caddyfile image'lar bilan mos bo'lsin), image'lar
# ghcr.io'dan yuklanadi → migratsiyalar → to'plam yangilanadi → kesh yangilanadi → smoke test.
#
# Orqaga qaytish: ./deploy.sh <oldingi commit>. Migratsiyalar orqaga qaytarilmaydi — yangi
# migratsiyali release'dan qaytish kerak bo'lsa, avval zaxira nusxadan tiklash (docs/deployment.md).

# Butun tana funksiyada: git checkout shu faylni o'zgartirsa ham, bash uni oldindan to'liq o'qigan
main() {
	set -euo pipefail
	local tag=${1:?Commit kerak: ./deploy.sh <commit> (Release workflow natijasidan)}
	[[ $tag =~ ^[0-9a-f]{7,40}$ ]] || {
		echo "XATO: commit noto'g'ri: $tag" >&2
		exit 1
	}
	cd "$(dirname "$0")"
	[[ -f .env ]] || {
		echo "XATO: .env yo'q (birinchi joylash — docs/deployment.md)" >&2
		exit 1
	}

	echo "==> Repo: $tag"
	git fetch --quiet origin
	git checkout --quiet --detach "$tag"

	local owner
	owner=$(git remote get-url origin | sed -E 's#.*github\.com[:/]([^/]+)/.*#\1#' | tr '[:upper:]' '[:lower:]')
	set_env BACKEND_IMAGE "ghcr.io/$owner/yaqin-backend:$tag"
	set_env FRONTEND_IMAGE "ghcr.io/$owner/yaqin-frontend:$tag"

	echo "==> Image'lar"
	docker compose pull --quiet

	echo "==> Migratsiyalar"
	docker compose up -d --wait db redis
	docker compose run --rm backend python manage.py migrate --noinput

	echo "==> To'plam"
	docker compose up -d --wait --remove-orphans

	echo "==> Kesh"
	./revalidate.sh

	echo "==> Smoke test"
	BASE=$(sed -n 's/^SITE_URL=//p' .env) ./smoke.sh

	# Bir haftadan eski, ishlatilmayotgan image'lar (kerak bo'lsa ghcr.io'dan qayta yuklanadi)
	docker image prune -af --filter until=168h >/dev/null
	echo "Joylandi: $tag"
}

# .env dagi qatorni almashtirish yoki qo'shish (qolgan qiymatlarga tegmaydi)
set_env() {
	if grep -q "^$1=" .env; then
		sed -i "s|^$1=.*|$1=$2|" .env
	else
		echo "$1=$2" >>.env
	fi
}

# Bitta qatorda: bash keyingi qatorni o'zgargan fayldan o'qimasin
main "$@"; exit
