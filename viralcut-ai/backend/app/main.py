"""ViralCut AI backend entrypoint.

Your videos are processed locally and are not uploaded to an external server.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_ORIGINS
from app.database import init_db
from app.routers import clips, export, processing, projects
from app.services.ffmpeg_service import is_ffmpeg_installed

app = FastAPI(title="ViralCut AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    whisper_available = True
    whisper_error = None
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        whisper_available = False
        whisper_error = "faster-whisper is not installed. Run 'pip install -r requirements.txt' in the backend venv."

    return {
        "status": "ok",
        "privacy_notice": "Your videos are processed locally and are not uploaded to an external server.",
        "ffmpeg_installed": is_ffmpeg_installed(),
        "whisper_available": whisper_available,
        "whisper_error": whisper_error,
    }


app.include_router(projects.router)
app.include_router(processing.router)
app.include_router(clips.router)
app.include_router(export.router)
