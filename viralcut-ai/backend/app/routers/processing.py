"""Kicking off and polling the background processing pipeline."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project
from app.schemas import GenerationSettings, ProjectStatusOut
from app.services import ffmpeg_service, job_manager
from app.utils.validation import validate_safe_id

router = APIRouter(prefix="/api/projects", tags=["processing"])


@router.post("/{project_id}/process", response_model=ProjectStatusOut)
async def start_processing(project_id: str, settings: GenerationSettings, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    if not project.video_path:
        raise HTTPException(status_code=400, detail="This project has no uploaded video yet.")
    if job_manager.is_processing(project_id):
        raise HTTPException(status_code=409, detail="This project is already being processed.")
    if not ffmpeg_service.is_ffmpeg_installed():
        raise HTTPException(
            status_code=503,
            detail="FFmpeg was not found on your system. Install it with 'brew install ffmpeg' and restart the backend.",
        )
    if settings.mode == "manual" and not settings.manual_ranges:
        raise HTTPException(status_code=422, detail="Manual mode requires at least one start/end range.")

    project.status = "processing"
    project.stage = "reading_video"
    project.progress = 0
    project.error_message = None
    project.settings_json = settings.model_dump_json()
    db.commit()

    asyncio.create_task(job_manager.start_processing(project_id, settings))

    return ProjectStatusOut(id=project.id, status=project.status, stage=project.stage, progress=project.progress)


@router.get("/{project_id}/status", response_model=ProjectStatusOut)
def get_status(project_id: str, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return ProjectStatusOut(
        id=project.id,
        status=project.status,
        stage=project.stage,
        progress=project.progress,
        error_message=project.error_message,
    )
