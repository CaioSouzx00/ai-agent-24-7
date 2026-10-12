# Architecture

```mermaid
flowchart LR
    subgraph Channels
        W[Web REST/WS] --- S[Slack] --- WA[WhatsApp]
    end
    Channels --> API[FastAPI]
    API --> T[Temporal Workflow]
    T --> G[LangGraph]
    G --> IC[Intent Classifier]
    IC -->|sensitive| H[Human handoff]
    IC --> MR[Memory Retriever]
    MR --> P[Planner]
    P --> TE[Tool Executor]
    TE --> RG[Response Generator]
    P --> LLM[(NVIDIA NIM)]
    MR --> PG[(Postgres + pgvector)]
    API --> R[(Redis sessions)]
    TE --> Tools[Web / Gmail / Calendar / Slack / GitHub / Vision]
```

Swapping the LLM: implement `LLMProvider` (`app/llm/base.py`) and register it in `app/llm/__init__.py`.
