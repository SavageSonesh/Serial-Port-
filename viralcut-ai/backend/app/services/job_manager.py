"""
Orchestrates the full "upload -> clips" pipeline as a background asyncio task,
persisting stage/progress to the Project row so the frontend can poll it, and
rendering clips one at a time (controlled concurrency) so a MacBook's CPU
isn't overwhelmed.
"""
import asyncio
import json
import logging
from pathlib import Path

from app.config import TEMP_DIR
from app.database import SessionLocal
from app.models import Clip, Project
from app.schemas import GenerationSettings
from app.services import face_service, ffmpeg_service, scoring_service, subtitle_service, title_service
from app.services.whisper_service import NoSpeechDetectedError, WhisperNotAvailableError, transcribe
from app.utils.files import free_disk_space_bytes, project_data_dir, project_temp_dir, clip_dir

logger = logging.getLogger("viralcut.jobs")

STAGES = [
    "reading_video",
    "extracting_audio",
    "transcribing_speech",
    "analyzing_moments",
    "selecting_clips",
    "detecting_speakers",
    "creating_subtitles",
    "rendering_previews",
    "exporting_final_clips",
]

MIN_FREE_BYTES = 500 * 1024 * 1024  # 500 MB
_running_projects: set = set()


def is_processing(project_id: str) -> bool:
    return project_id in _running_projects


def _set_project_progress(project_id: str, stage: str, progress: int, status: str = "processing", error: str = None):
    db = SessionLocal()
    try:
        project = db.get(Project, project_id)
        if not project:
            return
        project.stage = stage
        project.progress = progress
        project.status = status
        if error is not None:
            project.error_message = error
        db.commit()
    finally:
        db.close()


async def start_processing(project_id: str, settings: GenerationSettings):
    if project_id in _running_projects:
        return
    _running_projects.add(project_id)
    try:
        await asyncio.to_thread(_run_pipeline, project_id, settings)
    finally:
        _running_projects.discard(project_id)


def _run_pipeline(project_id: str, settings: GenerationSettings):
    db = SessionLocal()
    try:
        project = db.get(Project, project_id)
        if not project:
            return
        video_path = Path(project.video_path)
        proj_dir = project_data_dir(project_id)
        temp_dir = project_temp_dir(project_id)

        if free_disk_space_bytes(TEMP_DIR) < MIN_FREE_BYTES:
            _set_project_progress(project_id, "extracting_audio", 0, "error",
                                   "Insufficient storage space to process this video. Free up disk space and try again.")
            return

        # 1. reading video
        _set_project_progress(project_id, "reading_video", 5)
        if not video_path.exists():
            _set_project_progress(project_id, "reading_video", 0, "error", "The uploaded video file could not be found.")
            return

        # 2. extracting audio
        _set_project_progress(project_id, "extracting_audio", 12)
        audio_path = temp_dir / "audio.wav"
        try:
            ffmpeg_service.extract_audio(video_path, audio_path)
        except ffmpeg_service.FFmpegNotInstalledError as exc:
            _set_project_progress(project_id, "extracting_audio", 0, "error", str(exc))
            return
        except ffmpeg_service.FFmpegExecutionError as exc:
            _set_project_progress(project_id, "extracting_audio", 0, "error", str(exc))
            return

        # 3. transcribing speech
        _set_project_progress(project_id, "transcribing_speech", 18)

        def on_transcribe_progress(pct):
            _set_project_progress(project_id, "transcribing_speech", 18 + int(pct * 0.27))

        try:
            transcript = transcribe(audio_path, proj_dir, progress_cb=on_transcribe_progress)
        except WhisperNotAvailableError as exc:
            _set_project_progress(project_id, "transcribing_speech", 0, "error", str(exc))
            return
        except NoSpeechDetectedError as exc:
            _set_project_progress(project_id, "transcribing_speech", 0, "error", str(exc))
            return

        project.transcript_path = str(proj_dir / "transcript.json")
        db.commit()
        segments = transcript["segments"]

        # 4. analyzing interesting moments
        _set_project_progress(project_id, "analyzing_moments", 50)
        if settings.mode == "viral":
            candidates = scoring_service.select_viral_clips(segments, settings)
        elif settings.mode == "random":
            candidates = scoring_service.select_random_clips(segments, settings, project.duration)
        else:
            candidates = scoring_service.build_manual_clips(settings.manual_ranges, segments)

        # 5. selecting clips -> persist Clip rows
        _set_project_progress(project_id, "selecting_clips", 58)
        if not candidates:
            _set_project_progress(
                project_id, "selecting_clips", 0, "error",
                "Could not find any usable clip segments in this video. Try manual selection instead.",
            )
            return

        db.query(Clip).filter(Clip.project_id == project_id).delete()
        db.commit()

        clips = []
        for i, cand in enumerate(candidates):
            suggestions = title_service.generate_title_suggestions(cand["text"])
            clip = Clip(
                project_id=project_id,
                name=f"Clip {i + 1}",
                mode=settings.mode,
                start_time=cand["start"],
                end_time=cand["end"],
                viral_score=cand.get("score"),
                score_breakdown_json=json.dumps(cand.get("breakdown")) if cand.get("breakdown") else None,
                aspect_ratio=settings.aspect_ratio,
                resolution=settings.resolution,
                fps=settings.fps,
                crop_mode=settings.framing,
                subtitle_style=settings.subtitle_style,
                subtitles_enabled=settings.subtitles_enabled,
                remove_filler_words=settings.remove_filler_words,
                title_text=suggestions[0] if suggestions else None,
                title_suggestions_json=json.dumps(suggestions),
                status="pending",
            )
            db.add(clip)
            clips.append(clip)
        db.commit()
        for c in clips:
            db.refresh(c)

        # 6. detecting speakers (only needed for auto_track / split_screen)
        face_data = {"samples": [], "speakers": None}
        if settings.framing in ("auto_track", "split_screen"):
            _set_project_progress(project_id, "detecting_speakers", 63)
            try:
                face_data = face_service.analyze_faces(video_path, proj_dir)
            except face_service.FaceDetectionUnavailableError:
                face_data = {"samples": [], "speakers": None}

        # 7 + 8. creating subtitles + rendering previews/final clips (one at a time)
        clip_ids = [c.id for c in clips]
        total = len(clip_ids)
        for idx, clip_id in enumerate(clip_ids):
            base_pct = 68 + int((idx / max(1, total)) * 28)
            _set_project_progress(project_id, "creating_subtitles", base_pct)
            _render_single_clip(clip_id, segments, face_data)
            _set_project_progress(project_id, "rendering_previews", 68 + int(((idx + 1) / max(1, total)) * 28))

        # 9. exporting final clips
        _set_project_progress(project_id, "exporting_final_clips", 99)

        db2 = SessionLocal()
        try:
            ready_count = db2.query(Clip).filter(Clip.project_id == project_id, Clip.status == "ready").count()
            project2 = db2.get(Project, project_id)
            if ready_count == 0:
                project2.status = "error"
                project2.error_message = "All clips failed to render. Check the error details on each clip."
                project2.stage = "exporting_final_clips"
                project2.progress = 0
            else:
                project2.status = "ready"
                project2.stage = "done"
                project2.progress = 100
                project2.error_message = None
            db2.commit()
        finally:
            db2.close()

    except Exception as exc:  # noqa: BLE001 - top level safety net for background job
        logger.exception("Processing pipeline failed for project %s", project_id)
        _set_project_progress(project_id, "exporting_final_clips", 0, "error", f"Unexpected processing error: {exc}")
    finally:
        db.close()


def _render_single_clip(clip_id: str, segments: list, face_data: dict):
    db = SessionLocal()
    try:
        clip = db.get(Clip, clip_id)
        if not clip:
            return
        project = db.get(Project, clip.project_id)
        clip.status = "rendering"
        clip.progress = 10
        db.commit()

        out_dir = clip_dir(clip.project_id, clip.id)
        words = subtitle_service.words_in_range(segments, clip.start_time, clip.end_time)
        overrides = json.loads(clip.subtitle_settings_json) if clip.subtitle_settings_json else {}
        sub_settings = subtitle_service.merge_settings(clip.subtitle_style, overrides)
        filtered_words = subtitle_service.filter_filler_words(words, clip.remove_filler_words)

        out_w, out_h = ffmpeg_service.target_dimensions(clip.aspect_ratio, clip.resolution)

        ass_path = None
        if clip.subtitles_enabled and filtered_words:
            ass_path = out_dir / "subtitles.ass"
            subtitle_service.build_ass(filtered_words, sub_settings, out_w, out_h, ass_path, clip.start_time)

        srt_path = out_dir / "subtitles.srt"
        vtt_path = out_dir / "subtitles.vtt"
        if filtered_words:
            subtitle_service.build_srt(filtered_words, sub_settings["max_words"], srt_path, clip.start_time, sub_settings["capitalization"])
            subtitle_service.build_vtt(filtered_words, sub_settings["max_words"], vtt_path, clip.start_time, sub_settings["capitalization"])

        title_textfile = None
        if clip.title_enabled and clip.title_text:
            from app.utils.validation import sanitize_display_text
            title_textfile = out_dir / "title.txt"
            title_textfile.write_text(sanitize_display_text(clip.title_text, 80), encoding="utf-8")

        clip.progress = 30
        db.commit()

        face_samples = []
        speaker_x_fracs = None
        if clip.crop_mode == "auto_track":
            face_samples = face_service.samples_for_range(face_data, clip.start_time, clip.end_time)
        elif clip.crop_mode == "split_screen":
            speaker_x_fracs = face_service.speaker_positions(face_data)

        watermark_path = Path(clip.watermark_path) if clip.watermark_enabled and clip.watermark_path else None
        output_path = out_dir / "final.mp4"

        ffmpeg_service.render_clip(
            source_path=Path(project.video_path),
            output_path=output_path,
            start=clip.start_time,
            end=clip.end_time,
            out_w=out_w,
            out_h=out_h,
            fps=clip.fps,
            crop_mode=clip.crop_mode,
            src_w=project.width,
            src_h=project.height,
            face_samples=face_samples,
            speaker_x_fracs=speaker_x_fracs,
            ass_subtitle_path=ass_path,
            title_textfile=title_textfile,
            progress_bar=clip.progress_bar_enabled,
            watermark_path=watermark_path,
            muted=clip.muted,
            volume=clip.volume,
        )

        thumb_path = out_dir / "thumbnail.jpg"
        try:
            ffmpeg_service.generate_thumbnail(output_path, thumb_path, at_seconds=0.3)
        except ffmpeg_service.FFmpegExecutionError:
            thumb_path = None

        clip.status = "ready"
        clip.progress = 100
        clip.output_path = str(output_path)
        clip.thumbnail_path = str(thumb_path) if thumb_path else None
        clip.srt_path = str(srt_path) if srt_path.exists() else None
        clip.vtt_path = str(vtt_path) if vtt_path.exists() else None
        clip.error_message = None
        db.commit()

    except (ffmpeg_service.FFmpegNotInstalledError, ffmpeg_service.FFmpegExecutionError) as exc:
        _mark_clip_error(db, clip_id, str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Rendering failed for clip %s", clip_id)
        _mark_clip_error(db, clip_id, f"Unexpected rendering error: {exc}")
    finally:
        db.close()


def _mark_clip_error(db, clip_id: str, message: str):
    clip = db.get(Clip, clip_id)
    if clip:
        clip.status = "error"
        clip.progress = 0
        clip.error_message = message
        db.commit()


def rerender_clip(clip_id: str):
    db = SessionLocal()
    try:
        clip = db.get(Clip, clip_id)
        if not clip:
            return
        project = db.get(Project, clip.project_id)
        proj_dir = project_data_dir(clip.project_id)
        transcript_path = proj_dir / "transcript.json"
        segments = []
        if transcript_path.exists():
            segments = json.loads(transcript_path.read_text()).get("segments", [])
        face_data = {"samples": [], "speakers": None}
        if clip.crop_mode in ("auto_track", "split_screen"):
            try:
                face_data = face_service.analyze_faces(Path(project.video_path), proj_dir)
            except face_service.FaceDetectionUnavailableError:
                pass
    finally:
        db.close()
    _render_single_clip(clip_id, segments, face_data)
