"""Project lifecycle: upload, list, detail, delete, media streaming."""
import json
import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Clip, Project
from app.schemas import ProjectOut
from app.services import ffmpeg_service
from app.utils.files import delete_project_files, project_upload_dir
from app.utils.streaming import serve_file_with_range
from app.utils.validation import validate_duration, validate_extension, validate_safe_id

router = APIRouter(prefix="/api/projects", tags=["projects"])

MAX_CHUNK = 8 * 1024 * 1024


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    rows = (
        db.query(Project, func.count(Clip.id))
        .outerjoin(Clip, Clip.project_id == Project.id)
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
        .all()
    )
    result = []
    for project, clip_count in rows:
        out = ProjectOut.model_validate(project)
        out.clip_count = clip_count
        result.append(out)
    return result


@router.post("/upload", response_model=ProjectOut)
async def upload_project(file: UploadFile, db: Session = Depends(get_db)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file was uploaded.")
    validate_extension(file.filename)

    project = Project(
        name=Path(file.filename).stem[:120] or "Untitled Project",
        original_filename=file.filename,
        video_path="",
        status="uploading",
        stage="reading_video",
        progress=0,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    upload_dir = project_upload_dir(project.id)
    dest_path = upload_dir / f"original{Path(file.filename).suffix.lower()}"

    total = 0
    try:
        with open(dest_path, "wb") as out_f:
            while chunk := await file.read(MAX_CHUNK):
                total += len(chunk)
                out_f.write(chunk)
    except OSError as exc:
        delete_project_files(project.id)
        db.delete(project)
        db.commit()
        raise HTTPException(status_code=507, detail=f"Failed to save the uploaded file: {exc}") from exc

    if total == 0:
        delete_project_files(project.id)
        db.delete(project)
        db.commit()
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        info = ffmpeg_service.probe_video(dest_path)
    except ffmpeg_service.FFmpegNotInstalledError as exc:
        project.status = "error"
        project.error_message = str(exc)
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ffmpeg_service.FFmpegExecutionError as exc:
        delete_project_files(project.id)
        db.delete(project)
        db.commit()
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        validate_duration(info["duration"])
    except HTTPException:
        delete_project_files(project.id)
        db.delete(project)
        db.commit()
        raise

    thumb_path = upload_dir / "thumbnail.jpg"
    try:
        ffmpeg_service.generate_thumbnail(dest_path, thumb_path, at_seconds=min(1.0, info["duration"] / 2))
    except ffmpeg_service.FFmpegExecutionError:
        thumb_path = None

    project.video_path = str(dest_path)
    project.duration = info["duration"]
    project.width = info["width"]
    project.height = info["height"]
    project.fps = info["fps"]
    project.file_size = total
    project.thumbnail_path = str(thumb_path) if thumb_path else None
    project.status = "uploaded"
    project.stage = "uploaded"
    project.progress = 0
    db.commit()
    db.refresh(project)

    out = ProjectOut.model_validate(project)
    out.clip_count = 0
    return out


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    out = ProjectOut.model_validate(project)
    out.clip_count = db.query(Clip).filter(Clip.project_id == project_id).count()
    return out


@router.patch("/{project_id}", response_model=ProjectOut)
def rename_project(project_id: str, payload: dict, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    name = (payload or {}).get("name")
    if name:
        project.name = name[:120]
        db.commit()
        db.refresh(project)
    out = ProjectOut.model_validate(project)
    out.clip_count = db.query(Clip).filter(Clip.project_id == project_id).count()
    return out


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    db.delete(project)
    db.commit()
    delete_project_files(project_id)
    return {"ok": True}


@router.get("/{project_id}/video")
def stream_original_video(project_id: str, request: Request, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project or not project.video_path:
        raise HTTPException(status_code=404, detail="Video not found.")
    path = Path(project.video_path)
    media_type = mimetypes.guess_type(str(path))[0] or "video/mp4"
    return serve_file_with_range(request, path, media_type)


@router.get("/{project_id}/thumbnail")
def get_thumbnail(project_id: str, request: Request, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project or not project.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found.")
    return serve_file_with_range(request, Path(project.thumbnail_path), "image/jpeg")


@router.get("/{project_id}/transcript")
def get_transcript(project_id: str, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if not project.transcript_path or not Path(project.transcript_path).exists():
        raise HTTPException(status_code=404, detail="No transcript available yet for this project.")
    return json.loads(Path(project.transcript_path).read_text())
