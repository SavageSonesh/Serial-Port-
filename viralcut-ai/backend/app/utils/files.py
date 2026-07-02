"""Filesystem helpers for per-project storage."""
import shutil
from pathlib import Path

from app.config import EXPORTS_DIR, PROJECTS_DIR, TEMP_DIR, UPLOADS_DIR


def project_upload_dir(project_id: str) -> Path:
    d = UPLOADS_DIR / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def project_data_dir(project_id: str) -> Path:
    d = PROJECTS_DIR / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def project_temp_dir(project_id: str) -> Path:
    d = TEMP_DIR / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def project_export_dir(project_id: str) -> Path:
    d = EXPORTS_DIR / project_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def clip_dir(project_id: str, clip_id: str) -> Path:
    d = project_data_dir(project_id) / "clips" / clip_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def delete_project_files(project_id: str):
    for base in (UPLOADS_DIR, PROJECTS_DIR, EXPORTS_DIR, TEMP_DIR):
        target = base / project_id
        if target.exists():
            shutil.rmtree(target, ignore_errors=True)


def human_size(num_bytes: int) -> str:
    size = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"


def free_disk_space_bytes(path: Path) -> int:
    usage = shutil.disk_usage(path)
    return usage.free
