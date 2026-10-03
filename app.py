"""Local web UI for narrate.py. Run: uv run app.py  ->  http://127.0.0.1:8765"""

from __future__ import annotations

import asyncio
import json
import re
import secrets
import shutil
import subprocess
import threading
from datetime import datetime
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from narrate import DEFAULT_VOICE, ROOT, Narrator, RenderCancelled, to_srt, write_wav

OUTPUT_DIR = ROOT / "output"
STATIC_DIR = ROOT / "static"
DEFAULT_SCRIPT = ROOT / "scripts" / "graphql-update.txt"
DEFAULT_PRONUNCIATIONS = ROOT / "scripts" / "pronunciations.txt"
FILE_RE = re.compile(r"^[\w.-]+\.(wav|mp3|srt)$")
FFMPEG = shutil.which("ffmpeg")

OUTPUT_DIR.mkdir(exist_ok=True)
narrator = Narrator()
app = FastAPI(title="Narrator")
# The UI is built from frontend/ (Vue) into static/: index.html plus its hashed assets.
app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets", check_dir=False), name="assets")
jobs: dict[str, threading.Event] = {}  # running renders: job id -> cancel flag


class RenderRequest(BaseModel):
    script: str = Field(max_length=200_000)
    voice: str = DEFAULT_VOICE
    speed: float = Field(1.0, ge=0.5, le=2.0)
    sentence_pause: float = Field(0.35, ge=0, le=10)
    paragraph_pause: float = Field(0.8, ge=0, le=30)
    pronunciations: str = Field("", max_length=50_000)
    preview: bool = False


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return (STATIC_DIR / "index.html").read_text(encoding="utf-8")


@app.get("/api/config")
def config() -> dict:
    return {
        "voices": narrator.voices(),
        "default_voice": DEFAULT_VOICE,
        "default_script": _read(DEFAULT_SCRIPT),
        "default_pronunciations": _read(DEFAULT_PRONUNCIATIONS),
        "mp3": FFMPEG is not None,
    }


def _render(req: RenderRequest, progress, cancel: threading.Event) -> dict:
    result = narrator.render(
        req.script,
        voice=req.voice,
        speed=req.speed,
        sentence_pause=req.sentence_pause,
        paragraph_pause=req.paragraph_pause,
        pronunciations=req.pronunciations,
        progress=progress,
        cancel=cancel,
    )
    if result.duration == 0:
        raise ValueError("Nothing to say. The script has no speakable text.")

    name = "preview" if req.preview else datetime.now().strftime("narration-%Y%m%d-%H%M%S")
    write_wav(OUTPUT_DIR / f"{name}.wav", result.audio)
    (OUTPUT_DIR / f"{name}.srt").write_text(to_srt(result.timeline), encoding="utf-8")
    (OUTPUT_DIR / f"{name}.mp3").unlink(missing_ok=True)
    return {
        "name": name,
        "duration": result.duration,
        "timeline": result.timeline_dicts(),
        "warnings": result.warnings,
    }


@app.post("/api/render")
async def render(req: RenderRequest) -> StreamingResponse:
    """Streams NDJSON events: start (with the job id), progress..., then one of result, error or cancelled.
    Closing the connection or POST /api/render/{job}/cancel stops the render before its next sentence."""
    loop = asyncio.get_running_loop()
    events: asyncio.Queue[dict] = asyncio.Queue()
    job, cancel = secrets.token_urlsafe(8), threading.Event()

    def emit(event: dict) -> None:
        try:
            loop.call_soon_threadsafe(events.put_nowait, event)
        except RuntimeError:  # event loop already closed: the server is shutting down
            pass

    def work() -> None:
        try:
            emit({"type": "result", "result": _render(req, lambda p: emit({"type": "progress", **p}), cancel)})
        except RenderCancelled:
            emit({"type": "cancelled"})
        except ValueError as exc:
            emit({"type": "error", "detail": str(exc)})
        except Exception as exc:  # noqa: BLE001 - reported to the browser instead of a dropped connection
            emit({"type": "error", "detail": f"Render failed: {exc}"})

    async def stream():
        jobs[job] = cancel
        try:
            yield json.dumps({"type": "start", "job": job}) + "\n"
            loop.run_in_executor(None, work)
            while True:
                event = await events.get()
                yield json.dumps(event) + "\n"
                if event["type"] != "progress":
                    break
        finally:
            cancel.set()  # no-op when finished; stops the render when the client went away
            jobs.pop(job, None)

    return StreamingResponse(stream(), media_type="application/x-ndjson", headers={"Cache-Control": "no-store"})


@app.post("/api/render/{job}/cancel")
def cancel_render(job: str) -> dict:
    flag = jobs.get(job)
    if flag:
        flag.set()
    return {"cancelled": flag is not None}


@app.get("/api/files/{filename}")
def files(filename: str) -> FileResponse:
    if not FILE_RE.match(filename):
        raise HTTPException(404)
    path = OUTPUT_DIR / filename
    if path.suffix == ".mp3" and not path.exists():
        wav = path.with_suffix(".wav")
        if not FFMPEG or not wav.exists():
            raise HTTPException(404)
        subprocess.run(
            [FFMPEG, "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame", "-q:a", "2", str(path)],
            check=True,
        )
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path, headers={"Cache-Control": "no-store"})


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
