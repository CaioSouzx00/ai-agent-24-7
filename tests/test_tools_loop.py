"""Tests for the tool loop and the Web/Slack tools (Tasks 3.2, 3.5)."""

import json

import httpx
import pytest

from app.agent.graph import MAX_TOOL_ROUNDS, build_graph
from app.llm.base import LLMProvider, LLMResponse, ToolCall
from app.tools.base import BaseTool, ToolRegistry
from app.tools.slack import SlackTool
from app.tools.web import UnsafeURLError, WebBrowseTool, WebSearchTool, html_to_text


class ScriptedLLM(LLMProvider):
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls: list[tuple[list, bool]] = []

    async def chat(self, messages, tools=None, temperature=0.2):
        self.calls.append((list(messages), bool(tools)))
        return self.responses.pop(0) if self.responses else LLMResponse("final")


class CountTool(BaseTool):
    name = "count"
    description = "counts"

    def __init__(self):
        self.n = 0

    async def run(self, **kwargs):
        self.n += 1
        return f"n={self.n}"


class BoomTool(BaseTool):
    name = "boom"
    description = "fails"

    async def run(self, **kwargs):
        raise RuntimeError("kaboom")


def registry_with(*tools):
    reg = ToolRegistry()
    for t in tools:
        reg.register(t)
    return reg


async def test_multiple_tool_rounds():
    llm = ScriptedLLM(
        [
            LLMResponse("", [ToolCall("count", {}, "c1")]),
            LLMResponse("", [ToolCall("count", {}, "c2")]),
            LLMResponse("all done"),
        ]
    )
    tool = CountTool()
    out = await build_graph(llm, registry_with(tool)).ainvoke(
        {"session_id": "s", "user_input": "go"}
    )
    assert out["response"] == "all done"
    assert tool.n == 2
    last_msgs = llm.calls[-1][0]
    roles = [m["role"] for m in last_msgs]
    assert roles == ["system", "user", "assistant", "tool", "assistant", "tool"]
    assert last_msgs[3]["tool_call_id"] == "c1" and last_msgs[3]["content"] == "n=1"
    assert last_msgs[2]["tool_calls"][0]["function"]["name"] == "count"


async def test_tool_error_is_reported_to_model_not_raised():
    llm = ScriptedLLM([LLMResponse("", [ToolCall("boom", {})]), LLMResponse("sorry")])
    out = await build_graph(llm, registry_with(BoomTool())).ainvoke(
        {"session_id": "s", "user_input": "x"}
    )
    assert out["response"] == "sorry"
    assert "kaboom" in llm.calls[-1][0][-1]["content"]


async def test_unknown_tool_and_missing_call_id():
    llm = ScriptedLLM([LLMResponse("", [ToolCall("nope", {})]), LLMResponse("ok")])
    await build_graph(llm, ToolRegistry()).ainvoke({"session_id": "s", "user_input": "x"})
    tool_msg = llm.calls[-1][0][-1]
    assert tool_msg["role"] == "tool" and tool_msg["tool_call_id"]
    assert "unknown tool" in tool_msg["content"]


async def test_runaway_tool_loop_is_stopped():
    llm = ScriptedLLM([LLMResponse("", [ToolCall("count", {})]) for _ in range(50)])
    tool = CountTool()
    out = await build_graph(llm, registry_with(tool)).ainvoke(
        {"session_id": "s", "user_input": "x"}
    )
    assert tool.n == MAX_TOOL_ROUNDS
    assert llm.calls[-1][1] is False  # final call offered no tools
    assert "response" in out


# ---- Web ----


def test_html_to_text_strips_scripts():
    html = (
        "<html><head><title>t</title></head><body><script>x()</script>"
        "<p>Hello <b>world</b></p></body></html>"
    )
    assert html_to_text(html) == "Hello world"


async def test_web_browse_fetches_text():
    def handler(request):
        return httpx.Response(200, headers={"content-type": "text/html"}, text="<p>Hi there</p>")

    tool = WebBrowseTool(transport=httpx.MockTransport(handler), check_url=False)
    assert await tool.run(url="http://example.test/") == "Hi there"


async def test_web_browse_follows_redirects():
    def handler(request):
        if request.url.path == "/a":
            return httpx.Response(302, headers={"location": "/b"})
        return httpx.Response(200, headers={"content-type": "text/plain"}, text="landed")

    tool = WebBrowseTool(transport=httpx.MockTransport(handler), check_url=False)
    assert await tool.run(url="http://example.test/a") == "landed"


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://localhost:8000/",
        "http://169.254.169.254/latest",
        "file:///etc/passwd",
    ],
)
async def test_web_browse_blocks_private_and_non_http(url):
    with pytest.raises(UnsafeURLError):
        await WebBrowseTool().run(url=url)


async def test_web_search_parses_results():
    page = (
        '<a rel="nofollow" class="result__a" '
        'href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fpython.org%2F&rut=x">'
        "Python <b>Home</b></a>"
    )
    tool = WebSearchTool(transport=httpx.MockTransport(lambda r: httpx.Response(200, text=page)))
    assert await tool.run(query="python") == "- Python Home: https://python.org/"


# ---- Slack ----


async def test_slack_send_ok():
    def handler(request):
        body = json.loads(request.content)
        assert request.headers["authorization"] == "Bearer xoxb-1"
        assert body == {"channel": "#general", "text": "hi"}
        return httpx.Response(200, json={"ok": True, "ts": "1.2"})

    tool = SlackTool("xoxb-1", httpx.MockTransport(handler))
    assert "sent" in await tool.run(channel="#general", text="hi")


async def test_slack_api_error_and_missing_token():
    err = SlackTool(
        "t",
        httpx.MockTransport(
            lambda r: httpx.Response(200, json={"ok": False, "error": "channel_not_found"})
        ),
    )
    assert "channel_not_found" in await err.run(channel="#x", text="y")
    assert "not configured" in await SlackTool("").run(channel="#x", text="y")
