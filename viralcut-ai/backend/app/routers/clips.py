"""Per-clip retrieval, editing, regeneration, media streaming and deletion."""
import asyncio
import json
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Clip, Project
from app.schemas import ClipOut, ClipUpdate
from app.services import job_manager
from app.utils.files import clip_dir
from app.utils.streaming import serve_file_with_range
from app.utils.validation import sanitize_display_text, validate_safe_id, validate_time_range

router = APIRouter(prefix="/api", tags=["clips"])

ASPECTS = {"9:16", "1:1", "16:9"}
RESOLUTIONS = {"1080x1920", "720x1280"}
CROP_MODES = {"auto_track", "center", "blur_bg", "split_screen", "original"}
SUBTITLE_STYLES = {"clean_minimal", "bold_viral", "mrbeast", "modern_white_yellow", "karaoke", "documentary"}


def _to_clip_out(clip: Clip) -> ClipOut:
    out = ClipOut.model_validate(clip)
    out.score_breakdown = json.loads(clip.score_breakdown_json) if clip.score_breakdown_json else None
    out.subtitle_settings = json.loads(clip.subtitle_settings_json) if clip.subtitle_settings_json else None
    out.title_suggestions = json.loads(clip.title_suggestions_json) if clip.title_suggestions_json else None
    return out


@router.get("/projects/{project_id}/clips", response_model=list[ClipOut])
def list_clips(project_id: str, db: Session = Depends(get_db)):
    validate_safe_id(project_id, "project_id")
    clips = db.query(Clip).filter(Clip.project_id == project_id).order_by(Clip.start_time).all()
    return [_to_clip_out(c) for c in clips]


@router.get("/clips/{clip_id}", response_model=ClipOut)
def get_clip(clip_id: str, db: Session = Depends(get_db)):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found.")
    return _to_clip_out(clip)


@router.patch("/clips/{clip_id}", response_model=ClipOut)
def update_clip(clip_id: str, payload: ClipUpdate, db: Session = Depends(get_db)):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found.")
    project = db.get(Project, clip.project_id)

    data = payload.model_dump(exclude_unset=True)

    if "start_time" in data or "end_time" in data:
        new_start = data.get("start_time", clip.start_time)
        new_end = data.get("end_time", clip.end_time)
        validate_time_range(new_start, new_end, project.duration if project else 0)
        clip.start_time = new_start
        clip.end_time = new_end

    if "aspect_ratio" in data:
        if data["aspect_ratio"] not in ASPECTS:
            raise HTTPException(status_code=422, detail="Invalid aspect ratio.")
        clip.aspect_ratio = data["aspect_ratio"]
    if "resolution" in data:
        if data["resolution"] not in RESOLUTIONS:
            raise HTTPException(status_code=422, detail="Invalid resolution.")
        clip.resolution = data["resolution"]
    if "fps" in data:
        if data["fps"] not in (24, 30, 60):
            raise HTTPException(status_code=422, detail="FPS must be 24, 30 or 60.")
        clip.fps = data["fps"]
    if "crop_mode" in data:
        if data["crop_mode"] not in CROP_MODES:
            raise HTTPException(status_code=422, detail="Invalid crop mode.")
        clip.crop_mode = data["crop_mode"]
    if "subtitle_style" in data:
        if data["subtitle_style"] not in SUBTITLE_STYLES:
            raise HTTPException(status_code=422, detail="Invalid subtitle style.")
        clip.subtitle_style = data["subtitle_style"]
    if "subtitle_settings" in data:
        clip.subtitle_settings_json = json.dumps(data["subtitle_settings"])
    if "subtitles_enabled" in data:
        clip.subtitles_enabled = data["subtitles_enabled"]
    if "remove_filler_words" in data:
        clip.remove_filler_words = data["remove_filler_words"]
    if "title_text" in data:
        clip.title_text = sanitize_display_text(data["title_text"], 100)
    if "title_enabled" in data:
        clip.title_enabled = data["title_enabled"]
    if "progress_bar_enabled" in data:
        clip.progress_bar_enabled = data["progress_bar_enabled"]
    if "watermark_enabled" in data:
        clip.watermark_enabled = data["watermark_enabled"]
    if "muted" in data:
        clip.muted = data["muted"]
    if "volume" in data:
        clip.volume = max(0.0, min(4.0, data["volume"]))
    if "name" in data and data["name"]:
        clip.name = sanitize_display_text(data["name"], 100)

    clip.status = "pending"
    db.commit()
    db.refresh(clip)
    return _to_clip_out(clip)


@router.post("/clips/{clip_id}/watermark", response_model=ClipOut)
async def upload_watermark(clip_id: str, file: UploadFile, db: Session = Depends(get_db)):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found.")
    if not file.filename or not file.filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
        raise HTTPException(status_code=400, detail="Watermark must be a PNG, JPG or WEBP image.")

    out_dir = clip_dir(clip.project_id, clip.id)
    dest = out_dir / f"watermark{Path(file.filename).suffix.lower()}"
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Watermark image must be under 10 MB.")
    dest.write_bytes(content)

    clip.watermark_path = str(dest)
    clip.watermark_enabled = True
    clip.status = "pending"
    db.commit()
    db.refresh(clip)
    return _to_clip_out(clip)


@router.post("/clips/{clip_id}/regenerate", response_model=ClipOut)
async def regenerate_clip(clip_id: str, db: Session = Depends(get_db)):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found.")
    project = db.get(Project, clip.project_id)
    if not project or not project.video_path:
        raise HTTPException(status_code=400, detail="The source project video is missing.")

    clip.status = "rendering"
    clip.progress = 0
    clip.error_message = None
    db.commit()
    db.refresh(clip)

    asyncio.create_task(asyncio.to_thread(job_manager.rerender_clip, clip_id))
    return _to_clip_out(clip)


@router.delete("/clips/{clip_id}")
def delete_clip(clip_id: str, db: Session = Depends(get_db)):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found.")
    project_id, cid = clip.project_id, clip.id
    db.delete(clip)
    db.commit()

    d = clip_dir(project_id, cid)
    shutil.rmtree(d, ignore_errors=True)
    return {"ok": True}


@router.get("/clips/{clip_id}/video")
def stream_clip_video(clip_id: str, request: Request, db: Session = Depends(get_db)):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip or not clip.output_path:
        raise HTTPException(status_code=404, detail="This clip has not been rendered yet.")

    return serve_file_with_range(request, Path(clip.output_path), "video/mp4")


@router.get("/clips/{clip_id}/thumbnail")
def stream_clip_thumbnail(clip_id: str, request: Request, db: Session = Depends(get_db)):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip or not clip.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not available.")

    return serve_file_with_range(request, Path(clip.thumbnail_path), "image/jpeg")


@router.get("/clips/{clip_id}/download")
def download_clip(clip_id: str, db: Session = Depends(get_db)):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip or not clip.output_path:
        raise HTTPException(status_code=404, detail="This clip has not been rendered yet.")

    filename = f"{clip.name or 'clip'}.mp4".replace("/", "-")
    return FileResponse(Path(clip.output_path), media_type="video/mp4", filename=filename)


@router.get("/clips/{clip_id}/srt")
def download_srt(clip_id: str, db: Session = Depends(get_db)):
    return _download_subtitle(clip_id, db, "srt")


@router.get("/clips/{clip_id}/vtt")
def download_vtt(clip_id: str, db: Session = Depends(get_db)):
    return _download_subtitle(clip_id, db, "vtt")


def _download_subtitle(clip_id: str, db: Session, kind: str):
    validate_safe_id(clip_id, "clip_id")
    clip = db.get(Clip, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found.")
    path_str = clip.srt_path if kind == "srt" else clip.vtt_path
    if not path_str:
        raise HTTPException(status_code=404, detail=f"No {kind.upper()} subtitle file for this clip yet.")

    filename = f"{clip.name or 'clip'}.{kind}".replace("/", "-")
    media_type = "text/vtt" if kind == "vtt" else "application/x-subrip"
    return FileResponse(Path(path_str), media_type=media_type, filename=filename)
