# ==============================================================================
# Local Quality & Test Pipeline (Windows PowerShell)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Local Quality & Test Suite" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Resolve Python in the virtualenv, with a system Python fallback.
$PythonExe = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

Write-Host "`n--> [1/4] Running Ruff static analysis..." -ForegroundColor Yellow
& $PythonExe -m ruff check .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n--> [2/4] Checking Black formatting..." -ForegroundColor Yellow
& $PythonExe -m black --check .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n--> [3/4] Checking import ordering with isort..." -ForegroundColor Yellow
& $PythonExe -m isort --check-only .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n--> [4/4] Running Pytest suite with code coverage..." -ForegroundColor Yellow
& $PythonExe -m pytest -v --cov=app --cov-report=term-missing
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " All quality checks and tests passed successfully!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
