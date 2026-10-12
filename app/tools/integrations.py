"""Tools de integração (Tasks 3.2–3.7) — esqueletos a serem implementados."""

from __future__ import annotations

from typing import Any

from app.tools.base import BaseTool, registry


class _Stub(BaseTool):
    async def run(self, **kwargs: Any) -> str:
        raise NotImplementedError(f"Tool '{self.name}' ainda não implementada")


class WebBrowseTool(_Stub):  # Task 3.2 (Playwright)
    name = "web_browse"
    description = "Busca/navega em uma URL e retorna o texto da página."
    parameters = {
        "type": "object",
        "properties": {"url": {"type": "string"}},
        "required": ["url"],
    }


class GmailTool(_Stub):  # Task 3.3
    name = "gmail"
    description = "Lê ou envia e-mails via Gmail (OAuth)."


class CalendarTool(_Stub):  # Task 3.4
    name = "google_calendar"
    description = "Lista ou cria eventos no Google Calendar."


class SlackTool(_Stub):  # Task 3.5
    name = "slack"
    description = "Envia mensagens no Slack."


class GitHubTool(_Stub):  # Task 3.6
    name = "github"
    description = "Consulta issues/PRs e cria issues no GitHub."


class ImageAnalysisTool(_Stub):  # Task 3.7
    name = "image_analysis"
    description = "Analisa uma imagem com LLM multimodal."


for _t in (
    WebBrowseTool(),
    GmailTool(),
    CalendarTool(),
    SlackTool(),
    GitHubTool(),
    ImageAnalysisTool(),
):
    registry.register(_t)
