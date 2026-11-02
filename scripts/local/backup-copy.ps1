# Server zaxirasining shifrlangan nusxasini kompyuterga ko'chirish (5.5). Haftada 1-2 marta:
#
#   powershell -ExecutionPolicy Bypass -File scripts\local\backup-copy.ps1
#
# Zaxira serverda restic bilan shifrlangan (/var/backups/restic) va bu yerga shifrlanganicha keladi:
# parol kerak emas va kompyuterda saqlanmaydi. Ochish (tiklash) uchun BACKUP_PASSWORD — parol
# menejeridan. Faqat yangi fayllar ko'chiriladi. Serverda o'chirilgan fayllar (eski zaxiralarni
# tozalash yoki serverdagi buzilish) bu yerdan yo'qolmaydi — "olib-tashlangan\<sana>" ga o'tadi.
# S3 Toshkentda ishga tushguncha bu — serverdan tashqaridagi yagona nusxa; 10 kundan oshsa, server
# Telegram'da eslatadi (deploy/backup/healthcheck.sh).
#
# Talablar: D:\tools\rclone (rclone 1.75.2), `ssh yaqin` ishlaydi (docs/deployment.md, 5.3).
# Tekshirish: D:\tools\restic\restic.exe -r D:\yaqin-zaxira\repo snapshots (parol so'raladi).

param(
    [string]$Target = "D:\yaqin-zaxira",
    [string]$Server = "yaqin",
    [string]$Rclone = "D:\tools\rclone\rclone.exe"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $Rclone)) { throw "rclone topilmadi: $Rclone" }
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"

& $Rclone sync ":sftp:/var/backups/restic" "$Target\repo" `
    --sftp-ssh "ssh $Server" `
    --backup-dir "$Target\olib-tashlangan\$stamp" `
    --stats-one-line --stats 0 -v
if ($LASTEXITCODE -ne 0) { throw "Ko'chirish muvaffaqiyatsiz (rclone kodi: $LASTEXITCODE)" }

# Server eslatmasi uchun belgi (healthcheck.sh: 10 kundan eski bo'lsa — Telegram'da ogohlantirish)
ssh $Server "touch ~/.yaqin-pc-copy"
if ($LASTEXITCODE -ne 0) { throw "Serverga belgi qo'yilmadi (ssh kodi: $LASTEXITCODE)" }

$files = Get-ChildItem "$Target\repo" -Recurse -File
$size = ($files | Measure-Object -Property Length -Sum).Sum
$snapshots = @(Get-ChildItem "$Target\repo\snapshots" -File).Count
Write-Host ("Tayyor: {0} — {1} zaxira, {2} fayl, {3:N1} MB" -f "$Target\repo", $snapshots, $files.Count, ($size / 1MB))
