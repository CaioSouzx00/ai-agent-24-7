# Contribuindo

## Fluxo de branches
- `main` → produção (protegida, só via PR de `develop`)
- `develop` → desenvolvimento
- `feature/<nome>` → cada feature, criada a partir de `develop`

## Setup
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev,tools,workflows,observability]"
pre-commit install
pytest
```

## Pull Requests
1. Abra a branch `feature/*` a partir de `develop`.
2. Garanta `pre-commit run -a` e `pytest` passando.
3. Use commits no padrão [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`).
4. Abra o PR para `develop` referenciando a Task do roadmap (ex.: `Task 3.2`).
