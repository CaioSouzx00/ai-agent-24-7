#!/usr/bin/env bash
# ==============================================================================
# Local Quality & Test Pipeline (Replaces CI)
# Executes deterministic code formatting, static linting, and automated tests.
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo " Starting Local Quality & Test Suite"
echo "========================================================"

# Resolve Python in the virtual environment, with a system Python fallback.
PYTHON_BIN="${VIRTUAL_ENV:-.venv}/bin/python"
if [ ! -f "$PYTHON_BIN" ]; then
    PYTHON_BIN="python"
fi

# 2. Static Code Analysis & Formatting Checks
echo ""
echo "--> [1/4] Running Ruff static analysis..."
"$PYTHON_BIN" -m ruff check .

echo ""
echo "--> [2/4] Checking Black deterministic formatting..."
"$PYTHON_BIN" -m black --check .

echo ""
echo "--> [3/4] Checking import ordering with isort..."
"$PYTHON_BIN" -m isort --check-only .

# 3. Automated Test Suite Execution
echo ""
echo "--> [4/4] Running Pytest test suite with code coverage..."
"$PYTHON_BIN" -m pytest -v --cov=app --cov-report=term-missing

echo ""
echo "========================================================"
echo " All quality checks and automated tests passed!"
echo "========================================================"
