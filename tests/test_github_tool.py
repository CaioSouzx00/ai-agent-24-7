"""Unit tests for GitHubTool (Task 4)."""

import json

import httpx
import pytest

from app.tools.github import GitHubTool


async def test_github_missing_token(monkeypatch):
    tool = GitHubTool(token="")
    res = await tool.run(action="list_issues", repo="org/repo")
    assert "error: GITHUB_TOKEN is not configured" in res


async def test_github_invalid_repo():
    tool = GitHubTool(token="ghp_test")
    res = await tool.run(action="list_issues", repo="invalidrepo")
    assert "error: valid 'repo' in 'owner/name' format is required" in res


async def test_github_list_issues():
    def mock_handler(request: httpx.Request):
        assert request.url.path == "/repos/myorg/myrepo/issues"
        assert "Bearer ghp_valid" in request.headers["Authorization"]
        return httpx.Response(
            200,
            json=[
                {"number": 42, "title": "Fix login bug", "state": "open", "html_url": "https://github.com/myorg/myrepo/issues/42"},
                {"number": 43, "title": "Update README", "state": "open", "html_url": "https://github.com/myorg/myrepo/issues/43"},
            ],
        )

    transport = httpx.MockTransport(mock_handler)
    tool = GitHubTool(token="ghp_valid", transport=transport)
    result = await tool.run(action="list_issues", repo="myorg/myrepo")
    assert "#42: Fix login bug" in result
    assert "#43: Update README" in result


async def test_github_get_issue():
    def mock_handler(request: httpx.Request):
        assert request.url.path == "/repos/myorg/myrepo/issues/42"
        return httpx.Response(
            200,
            json={
                "number": 42,
                "title": "Fix login bug",
                "state": "open",
                "html_url": "https://github.com/myorg/myrepo/issues/42",
                "body": "Detailed bug description here.",
            },
        )

    transport = httpx.MockTransport(mock_handler)
    tool = GitHubTool(token="ghp_valid", transport=transport)
    result = await tool.run(action="get_issue", repo="myorg/myrepo", issue_number=42)
    assert "#42: Fix login bug" in result
    assert "Detailed bug description here." in result


async def test_github_create_issue():
    def mock_handler(request: httpx.Request):
        assert request.method == "POST"
        body = json.loads(request.content)
        assert body["title"] == "New Feature Request"
        return httpx.Response(
            201,
            json={
                "number": 99,
                "title": "New Feature Request",
                "html_url": "https://github.com/myorg/myrepo/issues/99",
            },
        )

    transport = httpx.MockTransport(mock_handler)
    tool = GitHubTool(token="ghp_valid", transport=transport)
    result = await tool.run(action="create_issue", repo="myorg/myrepo", title="New Feature Request", body="Details")
    assert "Issue created: #99" in result


async def test_github_get_repo():
    def mock_handler(request: httpx.Request):
        return httpx.Response(
            200,
            json={
                "full_name": "myorg/myrepo",
                "description": "Awesome AI agent",
                "stargazers_count": 128,
                "forks_count": 16,
            },
        )

    transport = httpx.MockTransport(mock_handler)
    tool = GitHubTool(token="ghp_valid", transport=transport)
    result = await tool.run(action="get_repo", repo="myorg/myrepo")
    assert "Repository myorg/myrepo: Awesome AI agent" in result
    assert "Stars: 128" in result
