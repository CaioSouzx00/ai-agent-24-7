"""Unit tests for Dashboard endpoint and Dynamic Tools REST API (Tasks 11 & 12)."""

from fastapi.testclient import TestClient

from app.main import app
from app.tools.base import registry

client = TestClient(app)


def test_dashboard_endpoint_html():
    response = client.get("/dashboard")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "AI Agent 24/7 Operations" in response.text
    assert "Prometheus Metrics Snapshot" in response.text


def test_dynamic_tools_rest_lifecycle():
    create_tool = registry.get("create_tool")
    prev_check = getattr(create_tool, "_check_url", True)
    if create_tool:
        create_tool._check_url = False

    try:
        # 1. Create a dynamic tool via REST
        payload = {
            "name": "weather_api_rest",
            "description": "Get current weather by city",
            "url": "https://api.weather.test/v1/current",
            "method": "GET",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
            },
        }
        r_post = client.post("/tools/dynamic", json=payload)
        assert r_post.status_code == 200
        assert r_post.json()["tool"] == "weather_api_rest"

        # 2. List dynamic tools
        r_get = client.get("/tools/dynamic")
        assert r_get.status_code == 200
        names = [t["function"]["name"] for t in r_get.json()]
        assert "weather_api_rest" in names
    finally:
        if create_tool:
            create_tool._check_url = prev_check

    # 3. Check tool exists in central registry
    assert registry.get("weather_api_rest") is not None

    # 4. Delete dynamic tool
    r_del = client.delete("/tools/dynamic/weather_api_rest")
    assert r_del.status_code == 200
    assert r_del.json()["ok"] is True

    # 5. Confirm deletion
    assert registry.get("weather_api_rest") is None
    r_del2 = client.delete("/tools/dynamic/weather_api_rest")
    assert r_del2.status_code == 404
