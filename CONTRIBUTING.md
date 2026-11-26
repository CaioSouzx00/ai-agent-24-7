# Contributing

Thanks for contributing. Keep changes focused, preserve existing behavior unless the change explicitly revises it, and include tests for changed behavior.

## Development setup

Use Python 3.11 or newer and Node.js 20.19+ or 22.12+. Install the Python project and optional development integrations from the repository root:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,tools,workflows,observability]"
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

Set the LLM endpoint and any integration credentials needed for the feature. Never commit `.env`, tokens, or customer data. Install frontend dependencies with `cd web && npm ci`.

## Development workflow

1. Create a focused branch from the current default branch. Do not assume a fixed `develop` branch exists.
2. Keep backend changes in the responsible `app/` module and frontend changes in the relevant feature module under `web/src/features/`.
3. Add or update tests that exercise changed behavior. Mock external services unless a test is explicitly marked for real integration.
4. Run backend checks from the repository root:

   ```bash
   python -m pytest
   python -m ruff check .
   python -m black --check .
   python -m isort --check-only .
   ```

5. For frontend changes, run from `web/`:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

6. Update README or architecture documentation when setup, behavior, or module responsibilities change.

## Code conventions

- Python supports 3.11+, uses type annotations, Ruff, Black, and isort with settings in `pyproject.toml`.
- TypeScript is strict. Keep feature-specific code within its feature and shared code independent from features.
- Validate external input at API boundaries, keep secrets out of logs and responses, and handle optional integration failures deliberately.
- Prefer small, direct changes over new abstraction layers. Avoid adding dependencies when the standard library or current stack is sufficient.

## Commits and pull requests

Use Conventional Commit style where practical (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). A pull request should explain the change, note configuration or deployment impact, and report checks actually run. Do not claim checks passed when they were skipped or blocked by missing local tooling.
