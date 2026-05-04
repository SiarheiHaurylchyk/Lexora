# Проверка исходящего IP контейнера backend (если внешний API режёт по региону — должен совпадать с VPN).

# Использование:

#   1) Включи VPN при необходимости.

#   2) docker compose up -d backend

#   3) .\scripts\check-backend-exit-ip.ps1



$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $root



Write-Host "Запрос ipinfo.io из контейнера backend..." -ForegroundColor Cyan

docker compose exec -T backend curl -sS --max-time 20 "https://ipinfo.io/json"

if ($LASTEXITCODE -ne 0) {

    Write-Host "`nОшибка: контейнер backend не запущен или curl недоступен." -ForegroundColor Red

    exit 1

}

Write-Host ""

