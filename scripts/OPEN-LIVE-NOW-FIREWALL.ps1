$ErrorActionPreference = "Stop"

$Rules = @(
    @{ Name = "Ibemhal Live Now LMS 3000"; Protocol = "TCP"; LocalPort = "3000" },
    @{ Name = "Ibemhal Live Now Signal 7880"; Protocol = "TCP"; LocalPort = "7880" },
    @{ Name = "Ibemhal Live Now RTC TCP 7881"; Protocol = "TCP"; LocalPort = "7881" },
    @{ Name = "Ibemhal Live Now RTC UDP 7882"; Protocol = "UDP"; LocalPort = "7882" }
)

foreach ($Rule in $Rules) {
    Get-NetFirewallRule -DisplayName $Rule.Name -ErrorAction SilentlyContinue |
        Remove-NetFirewallRule -ErrorAction SilentlyContinue

    New-NetFirewallRule `
        -DisplayName $Rule.Name `
        -Direction Inbound `
        -Action Allow `
        -Protocol $Rule.Protocol `
        -LocalPort $Rule.LocalPort `
        -Profile Any `
        -RemoteAddress LocalSubnet | Out-Null

    Write-Host "Allowed $($Rule.Protocol) $($Rule.LocalPort) from LocalSubnet" -ForegroundColor Green
}
