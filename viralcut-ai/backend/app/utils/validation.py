"""Input validation helpers used before touching the filesystem or shelling out to FFmpeg."""
import re
from pathlib import Path

from fastapi import HTTPException

from app.config import ALLOWED_VIDEO_EXTENSIONS, MAX_VIDEO_DURATION_SECONDS

_SAFE_ID_RE = re.compile(r"^[a-f0-9]{32}$")


def validate_safe_id(value: str, field_name: str = "id") -> str:
    """Ensure an id looks like one of our generated uuid4-hex ids (no path traversal)."""
    if not _SAFE_ID_RE.match(value or ""):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}.")
    return value


def validate_extension(filename: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_VIDEO_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext or 'unknown'}'. Allowed formats: {allowed}.",
        )
    return ext


def validate_duration(duration: float):
    if duration <= 0:
        raise HTTPException(
            status_code=422,
            detail="Could not read a valid duration from this video. The file may be corrupted.",
        )
    if duration > MAX_VIDEO_DURATION_SECONDS:
        hours = MAX_VIDEO_DURATION_SECONDS / 3600
        raise HTTPException(
            status_code=413,
            detail=f"Video is too long. The maximum supported length is {hours:.0f} hours.",
        )


def validate_time_range(start: float, end: float, duration: float):
    if start is None or end is None:
        raise HTTPException(status_code=422, detail="Start and end time are required.")
    if start < 0 or end <= start:
        raise HTTPException(status_code=422, detail="End time must be greater than start time.")
    if duration and end > duration + 0.5:
        raise HTTPException(status_code=422, detail="Clip range extends beyond the video duration.")


def within_project_dir(path: Path, project_dir: Path) -> bool:
    try:
        path.resolve().relative_to(project_dir.resolve())
        return True
    except ValueError:
        return False


def sanitize_display_text(text: str, max_len: int = 200) -> str:
    """Strip control characters from user-supplied text before it is burned into a video."""
    if text is None:
        return ""
    cleaned = "".join(ch for ch in text if ch.isprintable())
    return cleaned[:max_len]
