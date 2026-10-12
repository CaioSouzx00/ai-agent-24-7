"""Voice pipeline (Task 6): Speech-to-Text (STT) and Text-to-Speech (TTS)."""

from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from app.config import get_settings

log = logging.getLogger(__name__)


class SpeechToText:
    """Transcribes audio using Whisper / NVIDIA Riva (OpenAI-compatible /audio/transcriptions)."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url
        self._api_key = api_key
        self._model = model
        self._transport = transport

    async def transcribe(
        self, audio_bytes: bytes, filename: str = "audio.mp3", language: str | None = None
    ) -> str:
        s = get_settings()
        base_url = (self._base_url or s.nim_base_url).rstrip("/")
        api_key = self._api_key if self._api_key is not None else s.nim_api_key
        model = self._model or s.stt_model

        headers: dict[str, str] = {}
        if api_key and api_key != "not-needed-locally":
            headers["Authorization"] = f"Bearer {api_key}"

        files = {"file": (filename, audio_bytes, "audio/mpeg")}
        data: dict[str, Any] = {"model": model}
        if language:
            data["language"] = language

        try:
            async with httpx.AsyncClient(timeout=60.0, transport=self._transport) as client:
                resp = await client.post(
                    f"{base_url}/audio/transcriptions", headers=headers, files=files, data=data
                )
            if not resp.is_success:
                raise RuntimeError(f"STT API returned status {resp.status_code}: {resp.text[:200]}")
            return resp.json().get("text", "").strip()
        except Exception as exc:
            log.exception("STT transcription failed: %s", exc)
            raise


class TextToSpeech:
    """Synthesizes text into audio using OpenAI/NVIDIA TTS (/audio/speech)."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        voice: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url
        self._api_key = api_key
        self._model = model
        self._voice = voice
        self._transport = transport

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        s = get_settings()
        base_url = (self._base_url or s.nim_base_url).rstrip("/")
        api_key = self._api_key if self._api_key is not None else s.nim_api_key
        model = self._model or s.tts_model
        v = voice or self._voice or s.tts_voice

        headers = {"Content-Type": "application/json"}
        if api_key and api_key != "not-needed-locally":
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "model": model,
            "input": text,
            "voice": v,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0, transport=self._transport) as client:
                resp = await client.post(f"{base_url}/audio/speech", headers=headers, json=payload)
            if not resp.is_success:
                raise RuntimeError(f"TTS API returned status {resp.status_code}: {resp.text[:200]}")
            return resp.content
        except Exception as exc:
            log.exception("TTS synthesis failed: %s", exc)
            raise


class VoicePipeline:
    def __init__(self, stt: SpeechToText | None = None, tts: TextToSpeech | None = None) -> None:
        self.stt = stt or SpeechToText()
        self.tts = tts or TextToSpeech()

    async def process(
        self,
        audio_bytes: bytes,
        session_id: str,
        runner_fn,
        filename: str = "audio.mp3",
    ) -> dict[str, Any]:
        """Transcribe audio, run through the agent, synthesize reply to audio."""
        transcript = await self.stt.transcribe(audio_bytes, filename=filename)
        agent_out = await runner_fn(session_id, transcript, "voice")
        reply_text = agent_out.get("response") or "(no response)"

        audio_out = b""
        if reply_text and not agent_out.get("paused"):
            try:
                audio_out = await self.tts.synthesize(reply_text)
            except Exception as exc:
                log.warning("failed to synthesize voice reply: %s", exc)

        return {
            "transcript": transcript,
            "response": reply_text,
            "handoff": agent_out.get("handoff", False),
            "paused": agent_out.get("paused", False),
            "audio_base64": base64.b64encode(audio_out).decode("utf-8") if audio_out else "",
        }
