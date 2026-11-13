
param(
    [string]$DatabaseName = "brewlite"
)

$ErrorActionPreference = "Stop"

# Chi chap nhan ten database an toan
if ($DatabaseName -notmatch '^[a-zA-Z0-9_]+$') {
    throw "Ten database khong hop le."
}

$Root = Split-Path -Parent $PSScriptRoot
$SeedFile = Join-Path $Root "backend\src\database\seeds\initial-data.sql"

if (-not (Test-Path $SeedFile)) {
    throw "Khong tim thay file initial-data.sql"
}

Push-Location $Root

try {
    Write-Host "`n[1/5] Khoi dong PostgreSQL..." -ForegroundColor Cyan

    docker compose up -d postgres
    if ($LASTEXITCODE -ne 0) {
        throw "Khong the khoi dong PostgreSQL."
    }

    $ContainerId = docker compose ps -q postgres
    if (-not $ContainerId) {
        throw "Khong tim thay container PostgreSQL."
    }

    Write-Host "Dang cho PostgreSQL san sang..."

    $Healthy = $false

    for ($i = 0; $i -lt 60; $i++) {
        $Status = docker inspect --format '{{.State.Health.Status}}' $ContainerId

        if ($Status -eq "healthy") {
            $Healthy = $true
            break
        }

        if ($Status -eq "unhealthy") {
            throw "PostgreSQL khong khoe."
        }

        Start-Sleep -Seconds 2
    }

    if (-not $Healthy) {
        throw "Het thoi gian cho PostgreSQL khoi dong."
    }

    Write-Host "`n[2/5] Kiem tra database..." -ForegroundColor Cyan

$Exists = docker exec brewlite-postgres psql -U brewlite -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"

if ($LASTEXITCODE -ne 0) {
    throw "Khong the kiem tra database."
}

$ExistsText = ($Exists | Out-String).Trim()

if ($ExistsText -ne "1") {
        docker exec brewlite-postgres createdb -U brewlite $DatabaseName

        if ($LASTEXITCODE -ne 0) {
            throw "Khong the tao database."
        }
    }

    # Khong cho phep ghi de database da co bang
    $TableCount = docker exec brewlite-postgres psql -U brewlite -d $DatabaseName -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"

    if ($LASTEXITCODE -ne 0) {
        throw "Khong the kiem tra cac bang."
    }

    if ([int]$TableCount.Trim() -gt 0) {
        throw "Database $DatabaseName da co bang. Dung lai de tranh ghi de du lieu."
    }

    Write-Host "Database trong, co the khoi tao an toan."

    Write-Host "`n[3/5] Tao cac bang bang migration..." -ForegroundColor Cyan

    $PreviousUrl = $env:DATABASE_URL

    try {
        $env:DATABASE_URL = "postgresql://brewlite:brewlite123@localhost:5432/$DatabaseName"

        Push-Location (Join-Path $Root "backend")

        try {
            npm.cmd run migration:run

            if ($LASTEXITCODE -ne 0) {
                throw "Chay migration that bai."
            }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        if ($null -eq $PreviousUrl) {
            Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
        }
        else {
            $env:DATABASE_URL = $PreviousUrl
        }
    }

    Write-Host "`n[4/5] Nap du lieu mau..." -ForegroundColor Cyan

    docker cp $SeedFile brewlite-postgres:/tmp/brewlite-initial-data.sql

    if ($LASTEXITCODE -ne 0) {
        throw "Khong the sao chep file du lieu mau."
    }

    docker exec brewlite-postgres psql -v ON_ERROR_STOP=1 -U brewlite -d $DatabaseName -f /tmp/brewlite-initial-data.sql

    if ($LASTEXITCODE -ne 0) {
        throw "Nap du lieu mau that bai."
    }

    Write-Host "`n[5/5] Kiem tra du lieu..." -ForegroundColor Cyan

    $Counts = docker exec brewlite-postgres psql -U brewlite -d $DatabaseName -tAc "SELECT (SELECT COUNT(*) FROM products) || '|' || (SELECT COUNT(*) FROM ingredients) || '|' || (SELECT COUNT(*) FROM product_recipes)"

    if ($LASTEXITCODE -ne 0) {
        throw "Khong the kiem tra du lieu."
    }

    if ($Counts.Trim() -ne "4|21|62") {
        throw "So luong du lieu khong dung. Ket qua: $Counts"
    }

    Write-Host "`nKHOI TAO DATABASE THANH CONG!" -ForegroundColor Green
    Write-Host "San pham: 4"
    Write-Host "Nguyen lieu: 21"
    Write-Host "Cong thuc: 62"
    Write-Host "Database: $DatabaseName"
}
finally {
    Pop-Location
}
