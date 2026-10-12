"""Unit tests for Voice STT/TTS pipeline (Task 6)."""

import json

import httpx

from app.voice import SpeechToText, TextToSpeech, VoicePipeline


async def test_stt_transcribe_success():
    def mock_handler(request: httpx.Request):
        assert request.url.path == "/v1/audio/transcriptions"
        return httpx.Response(200, json={"text": "Olá mundo, este é um teste de voz."})

    transport = httpx.MockTransport(mock_handler)
    stt = SpeechToText(base_url="https://api.test/v1", api_key="test-key", transport=transport)
    result = await stt.transcribe(b"fake-audio-bytes", filename="test.mp3")
    assert result == "Olá mundo, este é um teste de voz."


async def test_tts_synthesize_success():
    def mock_handler(request: httpx.Request):
        assert request.url.path == "/v1/audio/speech"
        body = json.loads(request.content)
        assert body["input"] == "Olá mundo"
        return httpx.Response(200, content=b"fake-mp3-audio-bytes")

    transport = httpx.MockTransport(mock_handler)
    tts = TextToSpeech(base_url="https://api.test/v1", api_key="test-key", transport=transport)
    audio = await tts.synthesize("Olá mundo")
    assert audio == b"fake-mp3-audio-bytes"


async def test_voice_pipeline_end_to_end():
    def stt_handler(request: httpx.Request):
        return httpx.Response(200, json={"text": "Qual a capital da França?"})

    def tts_handler(request: httpx.Request):
        return httpx.Response(200, content=b"paris-audio-bytes")

    stt = SpeechToText(
        base_url="https://api.test/v1", api_key="test", transport=httpx.MockTransport(stt_handler)
    )
    tts = TextToSpeech(
        base_url="https://api.test/v1", api_key="test", transport=httpx.MockTransport(tts_handler)
    )
    pipeline = VoicePipeline(stt=stt, tts=tts)

    async def mock_runner(session_id, user_input, channel):
        return {"response": "A capital da França é Paris.", "handoff": False, "paused": False}

    out = await pipeline.process(b"audio-input", "session-1", mock_runner)
    assert out["transcript"] == "Qual a capital da França?"
    assert "Paris" in out["response"]
    assert bool(out["audio_base64"]) is True
