"""Smoke test against a REAL LLM endpoint (Task 1.3).

Usage:
    python scripts/smoke_llm.py

Reads NIM_BASE_URL / NIM_MODEL / NIM_API_KEY from the environment or .env.
Works with local NIM or the hosted https://integrate.api.nvidia.com/v1.
"""

import asyncio
import sys

from app.llm import get_llm

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"],
            },
        },
    }
]


async def main() -> int:
    llm = get_llm()
    print("1) plain chat...")
    r = await llm.chat([{"role": "user", "content": "Reply with exactly: pong"}])
    print("   ->", r.content)
    ok = bool(r.content)

    print("2) function calling...")
    r = await llm.chat(
        [{"role": "user", "content": "What's the weather in Recife? Use the tool."}], tools=TOOLS
    )
    print("   ->", r.tool_calls or r.content)
    ok = ok and bool(r.tool_calls)

    print("RESULT:", "OK" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
