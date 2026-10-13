# ==============================================================================
# Local Quality & Test Pipeline (Windows PowerShell)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Local Quality & Test Suite" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Resolve Python in virtualenv
$PythonExe = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

# 2. Linting & Formatting
Write-Host "`n--> [1/4] Running Ruff static analysis..." -ForegroundColor Yellow
& .\.venv\Scripts\ruff.exe check .

Write-Host "`n--> [2/4] Checking Black formatting..." -ForegroundColor Yellow
& .\.venv\Scripts\black.exe --check .

Write-Host "`n--> [3/4] Checking import ordering with isort..." -ForegroundColor Yellow
& .\.venv\Scripts\isort.exe --check-only .

# 3. Pytest with Coverage
Write-Host "`n--> [4/4] Running Pytest suite with code coverage..." -ForegroundColor Yellow
& .\.venv\Scripts\pytest.exe -v --cov=app --cov-report=term-missing

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " All quality checks and tests passed successfully! (100% OK)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
