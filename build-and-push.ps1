<#
.SYNOPSIS
    Build Docker images locally.

.DESCRIPTION
    Builds the Weekly Report Docker images (backend + frontend) for local development.

.PARAMETER Tag
    Image tag (default: latest)

.EXAMPLE
    .\build-and-push.ps1
    .\build-and-push.ps1 -Tag "1.0.0"
#>
param(
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Weekly Report - Local Docker Build"         -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1 - Build Backend
Write-Host "[1/3] Building Backend image..." -ForegroundColor Yellow
docker build -t "weekly-report-backend:${Tag}" -f Dockerfile.server .
if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
Write-Host "  Backend image built successfully" -ForegroundColor Green

# 2 - Build Frontend
Write-Host "[2/3] Building Frontend image..." -ForegroundColor Yellow
docker build -t "weekly-report-frontend:${Tag}" -f Dockerfile.client .
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
Write-Host "  Frontend image built successfully" -ForegroundColor Green

# 3 - Done
Write-Host ""
Write-Host "[3/3] Done!" -ForegroundColor Green
Write-Host ""
Write-Host "Built images:" -ForegroundColor Green
Write-Host "  - weekly-report-backend:${Tag}"
Write-Host "  - weekly-report-frontend:${Tag}"
Write-Host ""
Write-Host "Run with Docker Compose:"
Write-Host "  docker compose up -d"
Write-Host ""
