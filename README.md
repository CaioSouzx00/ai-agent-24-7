# ai-agent-24-7

Agente de IA que roda 24/7 com **LLM local da NVIDIA (NIM)**, memória, tools (web, Gmail, Calendar, Slack, GitHub, visão), múltiplos canais e handoff para humanos.

- Arquitetura: [docs/architecture.md](docs/architecture.md)
- Roadmap/status: [docs/ROADMAP.md](docs/ROADMAP.md)

## Rodando a LLM local

### Com GPU NVIDIA (NIM)
Requisitos: driver NVIDIA, Docker + NVIDIA Container Toolkit, conta NGC.
```bash
export NGC_API_KEY=<sua-chave>
docker compose -f infra/docker-compose.yml --profile gpu up nim
```
A API OpenAI-compatível fica em `http://localhost:8000/v1`.

### Sem GPU
NIM exige GPU. Alternativas: usar o endpoint hospedado `https://integrate.api.nvidia.com/v1`
(defina `NIM_BASE_URL` e `NIM_API_KEY` com a chave do build.nvidia.com), ou implementar
um `LLMProvider` para Ollama.

## Rodando o agente
```bash
cp .env.example .env
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8080
curl -X POST localhost:8080/chat -H "content-type: application/json" \
  -d '{"session_id":"demo","message":"Olá!"}'
```
Stack completa: `docker compose -f infra/docker-compose.yml --profile gpu up --build`.

## Testes
```bash
pytest
```

## Estrutura
```
app/    código (agent/, llm/, tools/, main.py, memory.py, workflows.py)
infra/  Dockerfile e docker-compose
tests/  testes
docs/   documentação
```

Veja [CONTRIBUTING.md](CONTRIBUTING.md) · [CHANGELOG.md](CHANGELOG.md) · Licença MIT.
