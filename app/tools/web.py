"""Web tools (Task 3.2): fetch a page as text and search the web.

Uses plain HTTP (no headless browser), so JavaScript-rendered pages are not supported.
Requests to private/loopback addresses are blocked to prevent SSRF.
"""

from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
from html.parser import HTMLParser
from typing import Any
from urllib.parse import parse_qs, unquote, urljoin, urlparse

import httpx

from app.tools.base import BaseTool

MAX_BYTES = 1_000_000
MAX_CHARS = 8_000
MAX_REDIRECTS = 3
USER_AGENT = "Mozilla/5.0 (compatible; ai-agent-24-7/0.1)"


class UnsafeURLError(ValueError):
    pass


async def assert_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise UnsafeURLError("only http(s) URLs are allowed")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        infos = await asyncio.to_thread(socket.getaddrinfo, parsed.hostname, port)
    except socket.gaierror as exc:
        raise UnsafeURLError(f"cannot resolve host: {parsed.hostname}") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise UnsafeURLError("URL resolves to a non-public address")


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "head"}

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip and data.strip():
            self.parts.append(data.strip())


def html_to_text(html: str) -> str:
    p = _TextExtractor()
    p.feed(html)
    return re.sub(r"\s+", " ", " ".join(p.parts)).strip()


def _client(transport: httpx.AsyncBaseTransport | None) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=15, follow_redirects=False, transport=transport, headers={"User-Agent": USER_AGENT}
    )


class WebBrowseTool(BaseTool):
    name = "web_browse"
    description = "Fetch a public web page (http/https) and return its text content."
    parameters = {
        "type": "object",
        "properties": {"url": {"type": "string", "description": "Full URL to fetch"}},
        "required": ["url"],
    }

    def __init__(self, transport: httpx.AsyncBaseTransport | None = None, check_url=True):
        self._transport = transport
        self._check_url = check_url

    async def run(self, **kwargs: Any) -> str:
        url = kwargs["url"]
        async with _client(self._transport) as client:
            for _ in range(MAX_REDIRECTS + 1):
                if self._check_url:
                    await assert_public_url(url)
                resp = await client.get(url)
                if resp.is_redirect:
                    url = urljoin(url, resp.headers["location"])
                    continue
                resp.raise_for_status()
                body = resp.content[:MAX_BYTES].decode(resp.encoding or "utf-8", errors="replace")
                ctype = resp.headers.get("content-type", "")
                text = html_to_text(body) if "html" in ctype else body
                return text[:MAX_CHARS] or "(empty page)"
        raise UnsafeURLError("too many redirects")


class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Search the web (DuckDuckGo) and return the top results with titles and URLs."
    parameters = {
        "type": "object",
        "properties": {"query": {"type": "string"}},
        "required": ["query"],
    }

    _LINK = re.compile(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.S)

    def __init__(self, transport: httpx.AsyncBaseTransport | None = None, limit: int = 5):
        self._transport = transport
        self._limit = limit

    @staticmethod
    def _clean_url(href: str) -> str:
        qs = parse_qs(urlparse(href).query)
        return unquote(qs["uddg"][0]) if "uddg" in qs else href

    async def run(self, **kwargs: Any) -> str:
        async with _client(self._transport) as client:
            resp = await client.post(
                "https://html.duckduckgo.com/html/", data={"q": kwargs["query"]}
            )
            resp.raise_for_status()
        results = []
        for href, title in self._LINK.findall(resp.text)[: self._limit]:
            results.append(f"- {html_to_text(title)}: {self._clean_url(href)}")
        return "\n".join(results) or "No results found."
