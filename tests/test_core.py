import pytest

from app.agent.graph import build_graph
from app.agent.handoff import needs_handoff
from app.llm.base import LLMProvider, LLMResponse, ToolCall
from app.tools.base import BaseTool, ToolRegistry


class FakeLLM(LLMProvider):
    def __init__(self, responses):
        self.responses = list(responses)

    async def chat(self, messages, tools=None, temperature=0.2):
        return self.responses.pop(0)


class EchoTool(BaseTool):
    name = "echo"
    description = "ecoa"

    async def run(self, **kwargs):
        return f"echo:{kwargs['text']}"


def test_handoff_detection():
    assert needs_handoff("Quero falar com humano sobre reembolso")
    assert not needs_handoff("Qual a previsão do tempo?")


async def test_simple_flow():
    graph = build_graph(FakeLLM([LLMResponse("olá!")]), ToolRegistry())
    out = await graph.ainvoke({"session_id": "s", "user_input": "oi"})
    assert out["response"] == "olá!"


async def test_tool_flow():
    reg = ToolRegistry()
    reg.register(EchoTool())
    llm = FakeLLM(
        [LLMResponse("", [ToolCall("echo", {"text": "x"})]), LLMResponse("feito: echo:x")]
    )
    out = await build_graph(llm, reg).ainvoke({"session_id": "s", "user_input": "use echo"})
    assert out["response"] == "feito: echo:x"


async def test_handoff_flow():
    graph = build_graph(FakeLLM([]), ToolRegistry())
    out = await graph.ainvoke({"session_id": "s", "user_input": "preciso de um advogado"})
    assert out["handoff"] is True


def test_registry_docs():
    reg = ToolRegistry()
    reg.register(EchoTool())
    assert "echo" in reg.docs()
    assert reg.schemas()[0]["function"]["name"] == "echo"


@pytest.mark.parametrize("path", ["/health", "/ready"])
def test_health(path):
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        assert c.get(path).status_code == 200
