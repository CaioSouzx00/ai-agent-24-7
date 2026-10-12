"""Unit tests for ImageAnalysisTool (Task 1)."""

import json

import httpx

from app.tools.vision import ImageAnalysisTool


async def test_vision_tool_requires_image_url():
    tool = ImageAnalysisTool(api_key="test-key")
    res = await tool.run(image_url="")
    assert "error: image_url is required" in res


async def test_vision_tool_success():
    def mock_handler(request: httpx.Request):
        body = json.loads(request.content)
        assert body["model"] == "meta/llama-3.2-11b-vision-instruct"
        assert (
            body["messages"][0]["content"][1]["image_url"]["url"] == "https://example.com/cat.jpg"
        )
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "A cute orange cat sleeping on a rug.",
                        }
                    }
                ]
            },
        )

    transport = httpx.MockTransport(mock_handler)
    tool = ImageAnalysisTool(
        base_url="https://test.api.nvidia.com/v1",
        model="meta/llama-3.2-11b-vision-instruct",
        api_key="nvapi-mock-key",
        transport=transport,
    )
    result = await tool.run(image_url="https://example.com/cat.jpg", prompt="What animal is this?")
    assert "A cute orange cat" in result


async def test_vision_tool_api_error():
    def mock_handler(request: httpx.Request):
        return httpx.Response(500, text="Internal Server Error")

    transport = httpx.MockTransport(mock_handler)
    tool = ImageAnalysisTool(
        base_url="https://test.api.nvidia.com/v1",
        api_key="nvapi-mock-key",
        transport=transport,
    )
    result = await tool.run(image_url="https://example.com/bad.jpg")
    assert "error: vision API returned status 500" in result
