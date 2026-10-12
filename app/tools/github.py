"""GitHub tool (Task 3.6): interact with GitHub issues and repositories."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings
from app.tools.base import BaseTool

log = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"


class GitHubTool(BaseTool):
    name = "github"
    description = "Interact with GitHub to list issues, get issue details, or create a new issue."
    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["list_issues", "get_issue", "create_issue", "get_repo"],
                "description": "Action to perform",
            },
            "repo": {
                "type": "string",
                "description": "Repository in owner/name format (e.g. 'octocat/Hello-World')",
            },
            "issue_number": {
                "type": "integer",
                "description": "Issue number (required for get_issue)",
            },
            "title": {
                "type": "string",
                "description": "Issue title (required for create_issue)",
            },
            "body": {
                "type": "string",
                "description": "Issue body text in markdown (for create_issue)",
            },
            "state": {
                "type": "string",
                "enum": ["open", "closed", "all"],
                "description": "Filter by issue state (default: open)",
            },
        },
        "required": ["action", "repo"],
    }

    def __init__(
        self,
        token: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._token = token
        self._transport = transport

    async def run(self, **kwargs: Any) -> str:
        token = self._token if self._token is not None else get_settings().github_token
        if not token:
            return "error: GITHUB_TOKEN is not configured"

        action = kwargs.get("action", "list_issues")
        repo = kwargs.get("repo", "").strip()
        if not repo or "/" not in repo:
            return "error: valid 'repo' in 'owner/name' format is required"

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ai-agent-24-7",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0, transport=self._transport) as client:
                if action == "list_issues":
                    state = kwargs.get("state", "open")
                    resp = await client.get(
                        f"{GITHUB_API}/repos/{repo}/issues",
                        headers=headers,
                        params={"state": state, "per_page": 10},
                    )
                    if not resp.is_success:
                        return f"error: GitHub API returned {resp.status_code}: {resp.text[:200]}"
                    issues = resp.json()
                    if not issues:
                        return f"No {state} issues found in {repo}."
                    lines = [f"Issues in {repo} ({state}):"]
                    for iss in issues[:10]:
                        lines.append(
                            f"- #{iss.get('number')}: {iss.get('title')} ({iss.get('state')}) - {iss.get('html_url')}"
                        )
                    return "\n".join(lines)

                elif action == "get_issue":
                    num = kwargs.get("issue_number")
                    if not num:
                        return "error: issue_number is required for get_issue"
                    resp = await client.get(f"{GITHUB_API}/repos/{repo}/issues/{num}", headers=headers)
                    if not resp.is_success:
                        return f"error: GitHub API returned {resp.status_code}: {resp.text[:200]}"
                    iss = resp.json()
                    return (
                        f"#{iss.get('number')}: {iss.get('title')}\n"
                        f"State: {iss.get('state')}\n"
                        f"URL: {iss.get('html_url')}\n\n"
                        f"{iss.get('body') or ''}"
                    )[:2000]

                elif action == "create_issue":
                    title = kwargs.get("title")
                    if not title:
                        return "error: title is required for create_issue"
                    body = kwargs.get("body", "")
                    resp = await client.post(
                        f"{GITHUB_API}/repos/{repo}/issues",
                        headers=headers,
                        json={"title": title, "body": body},
                    )
                    if not resp.is_success:
                        return f"error: GitHub API returned {resp.status_code}: {resp.text[:200]}"
                    created = resp.json()
                    return f"Issue created: #{created.get('number')} - {created.get('title')} ({created.get('html_url')})"

                elif action == "get_repo":
                    resp = await client.get(f"{GITHUB_API}/repos/{repo}", headers=headers)
                    if not resp.is_success:
                        return f"error: GitHub API returned {resp.status_code}: {resp.text[:200]}"
                    r = resp.json()
                    return f"Repository {r.get('full_name')}: {r.get('description')} (Stars: {r.get('stargazers_count')}, Forks: {r.get('forks_count')})"

                else:
                    return f"error: unknown action '{action}'"
        except Exception as exc:
            log.exception("github tool error: %s", exc)
            return f"error: {exc}"
