# Lokal integratsiya: frontend + backend birga, brauzerda http://localhost:8090
#
#   powershell -ExecutionPolicy Bypass -File scripts\local\start.ps1
#
# Uchta oyna ochiladi: Django (127.0.0.1:8000), Next.js (127.0.0.1:3000, demo rejim o'chiq) va
# Caddy (localhost:8090 — API'ni Django'ga, sahifalarni Next.js'ga yo'naltiradi). To'xtatish —
# oynalarni yoping (PostgreSQL ishlashda qoladi). Talablar: README.md, "Frontend + backend birga".

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Pg = "D:\tools\pgsql\bin"
$Caddy = "D:\tools\caddy\caddy.exe"

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

# Yangi migratsiyalar bo'lsa — bazaga qo'llash
Push-Location "$Root\backend"
try { & .\.venv\Scripts\python.exe manage.py migrate --no-input -v 0 } finally { Pop-Location }

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Yaqin backend :8000'; Set-Location '$Root\backend'; .\.venv\Scripts\waitress-serve.exe --listen=127.0.0.1:8000 --threads=16 config.wsgi:application"
)
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Yaqin frontend :3000'; Set-Location '$Root\frontend'; `$env:NEXT_PUBLIC_DEMO_MODE = 'false'; `$env:API_URL = 'http://127.0.0.1:8000/api/v1'; `$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:8090'; npm run dev"
)
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Yaqin Caddy :8090'; Set-Location '$Root'; & '$Caddy' run --config scripts\local\Caddyfile"
)

Write-Host ""
Write-Host "Ishga tushirildi. Brauzerda (birinchi ochilish 10-30 soniya):" -ForegroundColor Green
Write-Host "  Sayt:        http://localhost:8090"
Write-Host "  Admin panel: http://localhost:8090/admin"
