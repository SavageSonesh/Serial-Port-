"""Central configuration and filesystem layout for the ViralCut AI backend."""
from pathlib import Path

# backend/app/config.py -> viralcut-ai/
ROOT_DIR = Path(__file__).resolve().parent.parent.parent

UPLOADS_DIR = ROOT_DIR / "uploads"
PROJECTS_DIR = ROOT_DIR / "projects"
EXPORTS_DIR = ROOT_DIR / "exports"
TEMP_DIR = ROOT_DIR / "temp"
MODELS_DIR = ROOT_DIR / "models"
DB_PATH = ROOT_DIR / "projects" / "viralcut.db"

for d in (UPLOADS_DIR, PROJECTS_DIR, EXPORTS_DIR, TEMP_DIR, MODELS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Upload constraints
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm"}
MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024 * 1024  # 8 GB
MAX_VIDEO_DURATION_SECONDS = 4 * 60 * 60  # 4 hours

# Whisper
WHISPER_MODEL_SIZE = "base"  # tiny | base | small | medium | large-v3
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"

# CORS
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

FFMPEG_BINARY = "ffmpeg"
FFPROBE_BINARY = "ffprobe"
