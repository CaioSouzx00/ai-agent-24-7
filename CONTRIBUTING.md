# Contributing

## Branch workflow
- `main` → production (protected, only via PR from `develop`)
- `develop` → development
- `feature/<name>` → one per feature, branched from `develop`

## Setup
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev,tools,workflows,observability]"
pre-commit install
pytest
```

## Pull Requests
1. Create a `feature/*` branch from `develop`.
2. Make sure `pre-commit run -a` and `pytest` pass.
3. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`).
4. Open the PR against `develop`, referencing the roadmap Task (e.g. `Task 3.2`).
