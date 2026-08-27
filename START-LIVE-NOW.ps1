$ErrorActionPreference = "Stop"

$Project = "D:\LMS IAS WEBSITE"
$EnvFile = Join-Path $Project ".env.local"

if (-not (Test-Path -LiteralPath $Project -PathType Container)) {
    throw "Project folder not found: $Project"
}
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
    throw ".env.local is missing. Live Now will not start."
}

$EnvSize = (Get-Item -LiteralPath $EnvFile).Length
if ($EnvSize -le 0 -or $EnvSize -gt 1MB) {
    throw ".env.local is invalid or oversized ($EnvSize bytes). Run the V5.4.6 env repair."
}

# IMPORTANT:
# LiveKit development settings are PROCESS environment variables only.
# This launcher NEVER reads/re-writes/appends .env.local.
# This prevents the previous env-file growth/corruption problem permanently.
$env:LIVEKIT_URL = "ws://127.0.0.1:7880"
$env:LIVEKIT_API_KEY = "devkey"
$env:LIVEKIT_API_SECRET = "secret"
$env:LIVE_NOW_LICENSE_MODE = "owner"

Set-Location $Project

$Candidates = @(
    "D:\Liveclass lite\.tools\livekit",
    "D:\LiveClass lite\.tools\livekit",
    "D:\LMS IAS WEBSITE\.tools\livekit"
)

$Exe = $null
foreach ($Candidate in $Candidates) {
    if (Test-Path -LiteralPath $Candidate) {
        $Exe = Get-ChildItem -LiteralPath $Candidate -Filter "livekit-server.exe" -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($Exe) { break }
    }
}

if (-not $Exe) {
    $Command = Get-Command "livekit-server.exe" -ErrorAction SilentlyContinue
    if ($Command) { $Exe = Get-Item -LiteralPath $Command.Source }
}

if (-not $Exe) {
    throw "LiveKit server executable was not found."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " IBEMHAL IAS - LIVE NOW SAFE LOCAL START" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Mode        : LOCALHOST DEVELOPMENT" -ForegroundColor Yellow
Write-Host "LiveKit URL : ws://127.0.0.1:7880" -ForegroundColor Green
Write-Host "LMS         : http://localhost:3000" -ForegroundColor White
Write-Host ("env size    : {0:N2} KB" -f ($EnvSize / 1KB)) -ForegroundColor DarkGray
Write-Host "env editing : DISABLED" -ForegroundColor Green

Get-Process livekit-server,node -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 700

$LogDir = Join-Path $Project ".live-now-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$StdOut = Join-Path $LogDir "livekit-out.log"
$StdErr = Join-Path $LogDir "livekit-error.log"
Remove-Item $StdOut,$StdErr -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starting LiveKit..." -ForegroundColor Cyan

$LiveKitProc = Start-Process `
    -FilePath $Exe.FullName `
    -ArgumentList @("--dev") `
    -RedirectStandardOutput $StdOut `
    -RedirectStandardError $StdErr `
    -PassThru

$Ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $Ready = Test-NetConnection -ComputerName "127.0.0.1" -Port 7880 -InformationLevel Quiet -WarningAction SilentlyContinue
    } catch {
        $Ready = $false
    }
    if ($Ready) { break }
}

if (-not $Ready) {
    Write-Host "LiveKit did not open port 7880." -ForegroundColor Red
    Write-Host "Error log: $StdErr" -ForegroundColor Yellow
    if (Test-Path -LiteralPath $StdErr) { Get-Content -LiteralPath $StdErr -Tail 50 }
    throw "LiveKit startup failed."
}

Write-Host "PASS LiveKit port 7880 ready." -ForegroundColor Green
Write-Host ""
Write-Host "Starting Ibemhal IAS..." -ForegroundColor Cyan
Write-Host "Keep this terminal running." -ForegroundColor Yellow
Write-Host "Open: http://localhost:3000" -ForegroundColor Green
Write-Host ""

npm run dev