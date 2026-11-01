# Production image: Next.js standalone server (deploy/compose.yaml). Lokal ishlab chiqishda kerak emas.
#
# Build vaqtida backend kerak (sahifalar oldindan tayyorlanadi): `docker build --network host
# --build-arg API_URL=http://127.0.0.1:8000/api/v1 ...` — .github/workflows/docker.yml.
# Bo'sh bazadan tayyorlangan sahifalar joylashdan keyin kesh teglari bilan yangilanadi
# (docs/deployment.md).

FROM node:24-trixie-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
# NEXT_PUBLIC_* — brauzer kodiga build vaqtida yoziladi (maxfiy emas)
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TELEGRAM_BOT=""
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
ARG NEXT_PUBLIC_MAP_STYLE_URL=""
ARG API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_TELEGRAM_BOT=$NEXT_PUBLIC_TELEGRAM_BOT \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL \
    NEXT_PUBLIC_DEMO_MODE=false \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_SITE_URL" && test -n "$API_URL" && API_URL=$API_URL npm run build

FROM node:24-trixie-slim AS run
WORKDIR /app
# HOSTNAME=0.0.0.0 shart: boshqa qiymatda (masalan 127.0.0.1) standalone server proxy'ning til
# rewrite'ini tashqi deb hisoblaydi va "/" sahifasi o'ziga 307 bilan yo'naltirilib qoladi
# (lokal taqlidda tekshirilgan, docs/deployment.md)
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# `use cache` ishlovchisi (next.config.ts) — build yo'li bilan bir xil joyda bo'lishi shart
COPY --from=build --chown=node:node /app/cache-handler.mjs ./cache-handler.mjs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
