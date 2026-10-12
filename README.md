# ai-agent-24-7

24/7 AI agent powered by a **local NVIDIA NIM LLM**, with long-term memory, tool use (web, Gmail, Calendar, Slack, GitHub, vision), multi-channel inputs, and human handoff.

- Architecture: [docs/architecture.md](docs/architecture.md)
- Roadmap/status: [docs/ROADMAP.md](docs/ROADMAP.md)

## Running the local LLM

### With an NVIDIA GPU (NIM)
Requirements: NVIDIA driver, Docker + NVIDIA Container Toolkit, an NGC account.
```bash
export NGC_API_KEY=<your-key>
docker compose -f infra/docker-compose.yml --profile gpu up nim
```
The OpenAI-compatible API is served at `http://localhost:8000/v1`.

### Without a GPU
NIM requires a GPU. Alternatives: use the hosted endpoint `https://integrate.api.nvidia.com/v1`
(set `NIM_BASE_URL` and `NIM_API_KEY` with a key from build.nvidia.com), or implement
an `LLMProvider` for Ollama.

## Running the agent
```bash
cp .env.example .env
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8080
curl -X POST localhost:8080/chat -H "content-type: application/json" \
  -d '{"session_id":"demo","message":"Hello!"}'
```
Full stack: `docker compose -f infra/docker-compose.yml --profile gpu up --build`.

## Tests
```bash
pytest
```

## Structure
```
app/    code (agent/, llm/, tools/, main.py, memory.py, workflows.py)
infra/  Dockerfile and docker-compose
tests/  tests
docs/   documentation
```

See [CONTRIBUTING.md](CONTRIBUTING.md) · [CHANGELOG.md](CHANGELOG.md) · MIT License.

## Validating the LLM
```bash
python scripts/smoke_llm.py   # plain chat + function calling against NIM_BASE_URL
```
