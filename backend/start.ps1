# Starts the NEXUS backend using the project virtualenv.
# Usage:  .\start.ps1            (default: port 8000, reload on)
#         .\start.ps1 -Port 8080
#         .\start.ps1 -NoReload

param(
    [int]$Port = 8000,
    [switch]$NoReload
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $here ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "Virtualenv not found at $python. Run: python -m venv .venv; .venv\Scripts\activate; pip install -r requirements.txt"
    exit 1
}

$args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", $Port)
if (-not $NoReload) {
    $args += "--reload"
}

Write-Host "Starting NEXUS backend on http://localhost:$Port ..." -ForegroundColor Cyan
& $python $args