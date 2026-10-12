from app.config import get_settings
from app.llm.base import LLMProvider, LLMResponse, ToolCall
from app.llm.nim import NIMProvider


def get_llm() -> LLMProvider:
    s = get_settings()
    if s.llm_provider == "nim":
        return NIMProvider(
            s.nim_base_url, s.nim_model, s.nim_api_key, embed_model=s.nim_embed_model
        )
    raise ValueError(f"Unknown LLM provider: {s.llm_provider}")


__all__ = ["LLMProvider", "LLMResponse", "ToolCall", "NIMProvider", "get_llm"]
