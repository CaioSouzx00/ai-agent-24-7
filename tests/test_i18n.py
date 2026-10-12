"""Unit tests for internationalization and language detection (Task 9)."""

import pytest

from app.agent.graph import build_graph
from app.i18n import detect_language, get_localized_message
from app.llm.base import LLMProvider, LLMResponse
from app.tools.base import ToolRegistry


class DummyLLM(LLMProvider):
    def __init__(self):
        self.last_messages = []

    async def chat(self, messages, tools=None, temperature=0.2):
        self.last_messages = messages
        return LLMResponse(content="Resposta simulada.")

    async def embed(self, texts):
        return [[0.0] * 8 for _ in texts]


def test_detect_language_portuguese():
    assert detect_language("Olá, tudo bem? Gostaria de saber como cancelar minha conta.") == "pt"
    assert detect_language("Não consigo fazer login") == "pt"
    assert detect_language("Preciso de ajuda com meu estorno") == "pt"


def test_detect_language_english():
    assert detect_language("Hello, I need help with my account refund please.") == "en"
    assert detect_language("How do I cancel my subscription?") == "en"


def test_detect_language_spanish():
    assert detect_language("Hola, necesito hablar con un agente humano por favor.") == "es"
    assert detect_language("¿Dónde puedo cancelar mi cuenta?") == "es"


def test_detect_language_french():
    assert detect_language("Bonjour, j'ai besoin d'aide pour mon compte s'il vous plaît.") == "fr"


def test_detect_language_german():
    assert detect_language("Guten Tag, ich brauche bitte Hilfe mit meinem Problem.") == "de"


def test_detect_language_empty_and_default():
    assert detect_language("") == "en"
    assert detect_language("   ") == "en"


def test_localized_messages():
    assert (
        get_localized_message("handoff", "pt")
        == "Encaminhei sua solicitação para um atendente humano."
    )
    assert (
        get_localized_message("handoff", "en") == "I have forwarded your request to a human agent."
    )
    assert (
        get_localized_message("handoff", "es") == "He transferido su solicitud a un agente humano."
    )
    # Unknown language falls back to English
    assert (
        get_localized_message("handoff", "unknown")
        == "I have forwarded your request to a human agent."
    )


@pytest.mark.asyncio
async def test_agent_graph_system_prompt_includes_language():
    dummy = DummyLLM()
    tools = ToolRegistry()
    graph = build_graph(dummy, tools)

    await graph.ainvoke({"session_id": "s-pt", "user_input": "Olá, como você pode me ajudar hoje?"})

    assert dummy.last_messages
    system_msg = dummy.last_messages[0]["content"]
    assert "Portuguese" in system_msg
    assert "(pt)" in system_msg
