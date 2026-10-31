# Lokal integratsiya: frontend + backend birga, brauzerda http://localhost:8090
#
#   powershell -ExecutionPolicy Bypass -File scripts\local\start.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\local\start.ps1 -Tunnel   # + vaqtinchalik HTTPS
#
# Uchta oyna ochiladi: Django (127.0.0.1:8000), Next.js (127.0.0.1:3000, demo rejim o'chiq) va
# Caddy (localhost:8090 — API'ni Django'ga, sahifalarni Next.js'ga yo'naltiradi).
# Mijoz sifatida "Demo foydalanuvchi" tugmasi bilan kiriladi (backend buni faqat DEBUG'da beradi).
# To'xtatish — oynalarni yoping (PostgreSQL ishlashda qoladi). Talablar: README.md,
# "Frontend + backend birga".
#
# -Tunnel: Cloudflare Tunnel (D:\tools\cloudflared) — https://<tasodifiy>.trycloudflare.com manzil.
# Telegram kirishi (bot domenga bog'lanadi) va telefonda sinash (joylashuv va kamera faqat HTTPS'da)
# uchun. Tunnel ochiq paytda sayt internetdan ko'rinadi — sinovdan keyin oynasini yoping.
#
# -Prod: Next.js dev rejimi o'rniga production build (`.next-local`, birinchi marta 1-3 daqiqa).
# Telefonda sinash uchun tavsiya etiladi: sahifalar tez, kesh productiondagidek ishlaydi, dev
# belgisi yo'q. Kod o'zgarsa — qayta ishga tushiring (build yangilanadi).
#   powershell -ExecutionPolicy Bypass -File scripts\local\start.ps1 -Tunnel -Prod

param([switch]$Tunnel, [switch]$Prod)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Pg = "D:\tools\pgsql\bin"
$Caddy = "D:\tools\caddy\caddy.exe"
$Cloudflared = "D:\tools\cloudflared\cloudflared.exe"

foreach ($path in @("$Pg\pg_ctl.exe", $Caddy, "$Root\backend\.venv\Scripts\waitress-serve.exe", "$Root\frontend\node_modules")) {
    if (-not (Test-Path $path)) { throw "Topilmadi: $path (README.md dagi sozlash bosqichlarini bajaring)" }
}

foreach ($port in 3000, 8000, 8090) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port band — avvalgi oynalarni yoping yoki shu portdagi dasturni to'xtating"
    }
}

# PostgreSQL ishlamayotgan bo'lsa — ishga tushirish (kompyuter qayta yoqilgandan keyin kerak)
& "$Pg\pg_isready.exe" -h 127.0.0.1 -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "PostgreSQL ishga tushirilmoqda..."
    # Faqat pg_ctl'ning o'zi kutiladi (server jarayoni fonda qoladi)
    $process = Start-Process -FilePath "$Pg\pg_ctl.exe" -ArgumentList @("-D", "D:\tools\pgdata", "-l", "D:\tools\pgdata\server.log", "-w", "start") -WindowStyle Hidden -PassThru
    $process.WaitForExit()
    & "$Pg\pg_isready.exe" -h 127.0.0.1 -q
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL ishga tushmadi — D:\tools\pgdata\server.log ni ko'ring" }
}

# Vaqtinchalik HTTPS manzil: Caddy'ga localhost nomi bilan yetadi, brauzer esa tunnel manzilini
# ko'radi — u backendning ruxsat etilgan saytlari (Origin) ro'yxatiga qo'shiladi
$Origins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8090"
$TunnelUrl = $null
if ($Tunnel) {
    if (-not (Test-Path $Cloudflared)) { throw "Topilmadi: $Cloudflared" }
    $Log = Join-Path $env:TEMP "yaqin-tunnel.log"
    Remove-Item $Log -ErrorAction SilentlyContinue
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "`$Host.UI.RawUI.WindowTitle = 'Yaqin tunnel (HTTPS)'; & '$Cloudflared' tunnel --no-autoupdate --url http://localhost:8090 --http-host-header localhost:8090 --logfile '$Log'"
    )
    Write-Host "Tunnel ochilmoqda..."
    for ($i = 0; $i -lt 60 -and -not $TunnelUrl; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-Path $Log) {
            $match = Select-String -Path $Log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
            if ($match) { $TunnelUrl = $match.Matches[0].Value }
        }
    }
    if (-not $TunnelUrl) { throw "Tunnel manzili olinmadi — '$Log' ni ko'ring" }
    $Origins = "$Origins,$TunnelUrl"
}

# Yangi migratsiyalar bo'lsa — bazaga qo'llash
Push-Location "$Root\backend"
try { & .\.venv\Scripts\python.exe manage.py migrate --no-input -v 0 } finally { Pop-Location }

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Yaqin backend :8000'; Set-Location '$Root\backend'; `$env:DJANGO_ALLOWED_ORIGINS = '$Origins'; .\.venv\Scripts\waitress-serve.exe --listen=127.0.0.1:8000 --threads=16 config.wsgi:application"
)
# Production build demo build'dan (.next) alohida papkada — ularni bir-biri ustiga yozmaslik uchun
$FrontendRun = if ($Prod) {
    "`$env:NEXT_DIST_DIR = '.next-local'; npm run build; if (`$?) { npx next start --port 3000 }"
} else {
    "npm run dev"
}
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Yaqin frontend :3000'; Set-Location '$Root\frontend'; `$env:NEXT_PUBLIC_DEMO_MODE = 'false'; `$env:NEXT_PUBLIC_DEMO_LOGIN = 'true'; `$env:API_URL = 'http://127.0.0.1:8000/api/v1'; `$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:8090'; $FrontendRun"
)
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Yaqin Caddy :8090'; Set-Location '$Root'; & '$Caddy' run --config scripts\local\Caddyfile"
)

Write-Host ""
$FirstOpen = if ($Prod) { "frontend oynasida build tugagach — 1-3 daqiqa" } else { "birinchi ochilish 10-30 soniya" }
Write-Host "Ishga tushirildi. Brauzerda ($FirstOpen):" -ForegroundColor Green
Write-Host "  Sayt:        http://localhost:8090"
Write-Host "  Admin panel: http://localhost:8090/admin"
if ($TunnelUrl) {
    $TunnelHost = ([Uri]$TunnelUrl).Host
    Write-Host ""
    Write-Host "Vaqtinchalik HTTPS manzil (telefonda ham ochiladi): $TunnelUrl" -ForegroundColor Yellow
    Write-Host "  Telegram kirishi uchun: @BotFather -> /setdomain -> botingiz -> $TunnelHost"
    Write-Host "  Manzil har ishga tushirishda o'zgaradi. Sinovdan keyin tunnel oynasini yoping."
}
