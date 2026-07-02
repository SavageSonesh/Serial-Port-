"""
Lightweight face detection / tracking using OpenCV's bundled Haar cascade.

We deliberately avoid heavyweight face-recognition models to keep the app
runnable on a MacBook with no GPU and no extra downloads. Detected face
centers are sampled a few times per second, smoothed, and cached to disk so a
video is only analysed once. When no face can be found the caller should fall
back to a center crop.
"""
import json
from pathlib import Path
from typing import List, Optional, Tuple

SAMPLE_INTERVAL_SECONDS = 0.5
SMOOTHING_ALPHA = 0.35


class FaceDetectionUnavailableError(RuntimeError):
    pass


def _get_cascade():
    try:
        import cv2
    except ImportError as exc:
        raise FaceDetectionUnavailableError(
            "opencv-python is not installed. Run 'pip install -r requirements.txt' in the backend venv."
        ) from exc
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    if cascade.empty():
        raise FaceDetectionUnavailableError("Could not load OpenCV's face detection model.")
    return cv2, cascade


def face_track_cache_path(project_dir: Path) -> Path:
    return project_dir / "face_track.json"


def analyze_faces(video_path: Path, project_dir: Path) -> dict:
    """Sample frames across the whole video, detect faces, and return:
    {"samples": [[t, cx_frac, cy_frac], ...], "speakers": [x_frac_left, x_frac_right] | null}
    Cached to disk so re-processing the same project is instant.
    """
    cache_path = face_track_cache_path(project_dir)
    if cache_path.exists():
        try:
            return json.loads(cache_path.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    try:
        cv2, cascade = _get_cascade()
    except FaceDetectionUnavailableError:
        result = {"samples": [], "speakers": None}
        cache_path.write_text(json.dumps(result))
        return result

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        result = {"samples": [], "speakers": None}
        cache_path.write_text(json.dumps(result))
        return result

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1)
    duration = frame_count / fps if fps else 0

    step_frames = max(1, int(round(fps * SAMPLE_INTERVAL_SECONDS)))
    raw_samples: List[Tuple[float, float, float]] = []
    all_face_x: List[float] = []
    frame_idx = 0

    while True:
        ok = cap.grab()
        if not ok:
            break
        if frame_idx % step_frames == 0:
            ok, frame = cap.retrieve()
            if ok:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=5, minSize=(40, 40))
                if len(faces) > 0:
                    # largest face = primary speaker
                    fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
                    cx = (fx + fw / 2) / width
                    cy = (fy + fh / 2) / height
                    t = frame_idx / fps
                    raw_samples.append((t, cx, cy))
                    for (fx2, fy2, fw2, fh2) in faces:
                        all_face_x.append((fx2 + fw2 / 2) / width)
        frame_idx += 1

    cap.release()

    smoothed: List[Tuple[float, float, float]] = []
    if raw_samples:
        sx, sy = raw_samples[0][1], raw_samples[0][2]
        for t, cx, cy in raw_samples:
            sx = SMOOTHING_ALPHA * cx + (1 - SMOOTHING_ALPHA) * sx
            sy = SMOOTHING_ALPHA * cy + (1 - SMOOTHING_ALPHA) * sy
            smoothed.append((round(t, 2), round(sx, 4), round(sy, 4)))

    speakers = None
    if len(all_face_x) >= 6:
        left = [x for x in all_face_x if x < 0.5]
        right = [x for x in all_face_x if x >= 0.5]
        if len(left) >= 3 and len(right) >= 3:
            speakers = [round(sum(left) / len(left), 4), round(sum(right) / len(right), 4)]

    result = {"samples": smoothed, "speakers": speakers, "duration": duration}
    cache_path.write_text(json.dumps(result))
    return result


def samples_for_range(face_data: dict, start: float, end: float) -> List[Tuple[float, float, float]]:
    """Return face samples within [start, end], re-based to clip-relative time."""
    samples = face_data.get("samples") or []
    windowed = [(t - start, cx, cy) for t, cx, cy in samples if start <= t <= end]
    if not windowed:
        return []
    return windowed


def speaker_positions(face_data: dict) -> Optional[Tuple[float, float]]:
    speakers = face_data.get("speakers")
    if speakers and len(speakers) == 2:
        return tuple(speakers)
    return None
