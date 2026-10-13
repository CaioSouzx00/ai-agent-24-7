"""Voice routing: multipart audio ingestion, speech-to-text, and speech synthesis."""

from __future__ import annotations

from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Request,
    UploadFile,
)

from app.ratelimit import check_rate_limit
from app.runner import run_agent
from app.security import require_api_key
from app.voice import VoicePipeline

router = APIRouter(tags=["voice"])


@router.post("/voice/chat", dependencies=[Depends(require_api_key), Depends(check_rate_limit)])
async def voice_chat(
    request: Request,
    file: UploadFile = File(...),  # noqa: B008
    session_id: str = Form(...),  # noqa: B008
) -> dict[str, Any]:
    """Transcribe audio, execute conversational agent turn, and synthesize voice response."""
    audio_bytes = await file.read()
    pipeline = getattr(request.app.state, "voice", None) or VoicePipeline()

    async def _runner(sid: str, text: str, channel: str) -> dict[str, Any]:
        return await run_agent(request.app, sid, text, channel)

    return await pipeline.process(
        audio_bytes,
        session_id,
        _runner,
        filename=file.filename or "audio.mp3",
    )
