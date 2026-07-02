"""Local speech transcription using faster-whisper, with on-disk JSON caching so
the same video is never transcribed twice."""
import json
from pathlib import Path
from typing import Optional

from app.config import MODELS_DIR, WHISPER_COMPUTE_TYPE, WHISPER_DEVICE, WHISPER_MODEL_SIZE

_model = None


class WhisperNotAvailableError(RuntimeError):
    pass


class NoSpeechDetectedError(RuntimeError):
    pass


def _get_model():
    global _model
    if _model is not None:
        return _model
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise WhisperNotAvailableError(
            "faster-whisper is not installed. Run 'pip install -r requirements.txt' "
            "inside the backend virtual environment."
        ) from exc

    try:
        _model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
            download_root=str(MODELS_DIR),
        )
    except Exception as exc:  # noqa: BLE001 - surfaced to the user as a setup error
        raise WhisperNotAvailableError(
            f"Could not load the Whisper model '{WHISPER_MODEL_SIZE}'. Check your internet "
            f"connection for the first-time model download, or see the README for manual "
            f"model setup. Original error: {exc}"
        ) from exc
    return _model


def transcript_cache_path(project_dir: Path) -> Path:
    return project_dir / "transcript.json"


def load_cached_transcript(project_dir: Path) -> Optional[dict]:
    path = transcript_cache_path(project_dir)
    if path.exists():
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            return None
    return None


def transcribe(audio_path: Path, project_dir: Path, progress_cb=None) -> dict:
    """Transcribe audio with word-level timestamps. Returns cached result if present."""
    cached = load_cached_transcript(project_dir)
    if cached is not None:
        return cached

    model = _get_model()
    segments_iter, info = model.transcribe(
        str(audio_path),
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
    )

    segments = []
    full_text_parts = []
    duration = info.duration if info and info.duration else 1.0

    for i, seg in enumerate(segments_iter):
        words = [
            {"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
            for w in (seg.words or [])
            if w.word and w.word.strip()
        ]
        text = seg.text.strip()
        if text:
            full_text_parts.append(text)
        segments.append(
            {
                "id": i,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": text,
                "words": words,
            }
        )
        if progress_cb:
            pct = min(99, int((seg.end / duration) * 100)) if duration else 0
            progress_cb(pct)

    result = {
        "language": getattr(info, "language", None),
        "segments": segments,
        "full_text": " ".join(full_text_parts),
    }

    if not segments or not result["full_text"].strip():
        raise NoSpeechDetectedError(
            "No speech was detected in this video. Try a different file or check that it "
            "has an audible voice track."
        )

    transcript_cache_path(project_dir).write_text(json.dumps(result, indent=2))
    return result
