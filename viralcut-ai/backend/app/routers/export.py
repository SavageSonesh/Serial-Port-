"""Batch export: ZIP of all ready clips for a project."""
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Clip, Project
from app.utils.files import project_export_dir
from app.utils.validation import validate_safe_id

router = APIRouter(prefix="/api/projects", tags=["export"])


@router.get("/{project_id}/export/zip")
def export_zip(project_id: str, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    clips = db.query(Clip).filter(Clip.project_id == project_id, Clip.status == "ready").all()
    if not clips:
        raise HTTPException(status_code=404, detail="No rendered clips are available to export yet.")

    export_dir = project_export_dir(project_id)
    zip_path = export_dir / "clips_export.zip"

    used_names = set()
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for clip in clips:
            base_name = (clip.name or f"clip_{clip.id[:8]}").replace("/", "-")
            name = base_name
            n = 1
            while name in used_names:
                name = f"{base_name}_{n}"
                n += 1
            used_names.add(name)

            if clip.output_path and Path(clip.output_path).exists():
                zf.write(clip.output_path, arcname=f"{name}.mp4")
            if clip.srt_path and Path(clip.srt_path).exists():
                zf.write(clip.srt_path, arcname=f"{name}.srt")
            if clip.vtt_path and Path(clip.vtt_path).exists():
                zf.write(clip.vtt_path, arcname=f"{name}.vtt")

    return FileResponse(zip_path, media_type="application/zip", filename=f"{project.name}_clips.zip")
