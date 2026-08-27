$ErrorActionPreference = "Continue"

Write-Host "`n=== LIVE NOW LOCAL DIAGNOSTIC ===" -ForegroundColor Cyan

Write-Host "`nLiveKit process:" -ForegroundColor Yellow
Get-Process livekit-server -ErrorAction SilentlyContinue |
    Select-Object Id, ProcessName, Path

Write-Host "`nPort 7880:" -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 7880 -State Listen -ErrorAction SilentlyContinue |
    Select-Object LocalAddress, LocalPort, OwningProcess

Write-Host "`nPort 7881:" -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 7881 -State Listen -ErrorAction SilentlyContinue |
    Select-Object LocalAddress, LocalPort, OwningProcess

Write-Host "`n.env.local LiveKit URL:" -ForegroundColor Yellow
Get-Content "D:\LMS IAS WEBSITE\.env.local" |
    Select-String "^LIVEKIT_URL="

Write-Host "`nLiveKit stdout tail:" -ForegroundColor Yellow
Get-Content "D:\LMS IAS WEBSITE\.live-now-logs\livekit-out.log" -Tail 30 -ErrorAction SilentlyContinue

Write-Host "`nLiveKit stderr tail:" -ForegroundColor Yellow
Get-Content "D:\LMS IAS WEBSITE\.live-now-logs\livekit-error.log" -Tail 30 -ErrorAction SilentlyContinue
