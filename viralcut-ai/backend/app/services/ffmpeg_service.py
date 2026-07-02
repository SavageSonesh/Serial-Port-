"""
All FFmpeg / FFprobe interaction lives here.

Security note: every ffmpeg/ffprobe invocation uses subprocess with an argument
LIST (never shell=True and never string-concatenated shell commands), so user
supplied values can never break out into shell metacharacters. Any free text
that gets burned into a video (titles, watermark text) is written to a file on
disk and referenced via a filter's `textfile=`/file option instead of being
interpolated into the filter string, which avoids filter-syntax injection too.
"""
import json
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

from app.config import FFMPEG_BINARY, FFPROBE_BINARY


class FFmpegNotInstalledError(RuntimeError):
    pass


class FFmpegExecutionError(RuntimeError):
    def __init__(self, message: str, stderr: str = ""):
        super().__init__(message)
        self.stderr = stderr


def is_ffmpeg_installed() -> bool:
    return shutil.which(FFMPEG_BINARY) is not None and shutil.which(FFPROBE_BINARY) is not None


def _require_ffmpeg():
    if not is_ffmpeg_installed():
        raise FFmpegNotInstalledError(
            "FFmpeg was not found on your system. Install it with 'brew install ffmpeg' "
            "and restart the backend server."
        )


def _run(args: Sequence[str], timeout: Optional[int] = None) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            list(args),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError as exc:
        raise FFmpegNotInstalledError(str(exc)) from exc


def probe_video(path: Path) -> dict:
    """Return duration, width, height, fps, has_audio, size for a video file."""
    _require_ffmpeg()
    if not path.exists():
        raise FFmpegExecutionError(f"File not found: {path}")

    args = [
        FFPROBE_BINARY,
        "-v", "error",
        "-show_entries", "format=duration,size",
        "-show_streams",
        "-of", "json",
        str(path),
    ]
    result = _run(args, timeout=60)
    if result.returncode != 0:
        raise FFmpegExecutionError(
            "Could not read this video. It may be corrupted or in an unsupported format.",
            stderr=result.stderr,
        )

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise FFmpegExecutionError("Could not parse video metadata.", stderr=result.stderr) from exc

    fmt = data.get("format", {})
    streams = data.get("streams", [])
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    if video_stream is None:
        raise FFmpegExecutionError("No video stream found in this file.")

    duration = float(fmt.get("duration") or video_stream.get("duration") or 0.0)
    width = int(video_stream.get("width") or 0)
    height = int(video_stream.get("height") or 0)

    fps = 30.0
    rate_str = video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate")
    if rate_str and rate_str != "0/0":
        num, _, den = rate_str.partition("/")
        try:
            den_f = float(den) if den else 1.0
            fps = float(num) / den_f if den_f else float(num)
        except (ValueError, ZeroDivisionError):
            fps = 30.0

    return {
        "duration": duration,
        "width": width,
        "height": height,
        "fps": round(fps, 3),
        "has_audio": audio_stream is not None,
        "size": int(fmt.get("size") or 0),
    }


def generate_thumbnail(video_path: Path, out_path: Path, at_seconds: float = 1.0):
    _require_ffmpeg()
    args = [
        FFMPEG_BINARY, "-y",
        "-ss", str(max(0.0, at_seconds)),
        "-i", str(video_path),
        "-frames:v", "1",
        "-vf", "scale=480:-2",
        str(out_path),
    ]
    result = _run(args, timeout=60)
    if result.returncode != 0 or not out_path.exists():
        raise FFmpegExecutionError("Failed to generate a thumbnail for this video.", stderr=result.stderr)


def extract_audio(video_path: Path, out_wav_path: Path):
    _require_ffmpeg()
    args = [
        FFMPEG_BINARY, "-y",
        "-i", str(video_path),
        "-vn", "-ac", "1", "-ar", "16000",
        "-f", "wav",
        str(out_wav_path),
    ]
    result = _run(args, timeout=600)
    if result.returncode != 0 or not out_wav_path.exists():
        raise FFmpegExecutionError(
            "Failed to extract audio from this video. It may have no audio track.",
            stderr=result.stderr,
        )


def _escape_filter_path(path: str) -> str:
    """Escape a filesystem path for safe use inside an ffmpeg filtergraph string."""
    escaped = path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    return escaped


RESOLUTIONS = {
    "1080x1920": (1080, 1920),
    "720x1280": (720, 1280),
}

ASPECT_DIMENSIONS = {
    # base target size, actual output is scaled to the requested resolution height
    "9:16": (9, 16),
    "1:1": (1, 1),
    "16:9": (16, 9),
}


def target_dimensions(aspect_ratio: str, resolution_key: str) -> Tuple[int, int]:
    """Compute output (width, height) honouring aspect ratio, using the requested
    resolution's long edge as the target size."""
    base_w, base_h = RESOLUTIONS.get(resolution_key, (1080, 1920))
    long_edge = max(base_w, base_h)
    ar_w, ar_h = ASPECT_DIMENSIONS.get(aspect_ratio, (9, 16))

    if ar_w >= ar_h:
        width = long_edge
        height = round(long_edge * ar_h / ar_w)
    else:
        height = long_edge
        width = round(long_edge * ar_w / ar_h)

    # even dimensions required by libx264 yuv420p
    width -= width % 2
    height -= height % 2
    return width, height


def _build_interp_expr(samples: List[Tuple[float, float]], fallback: float) -> str:
    """Build a piecewise-linear ffmpeg expression interpolating `value` over `t`
    from (t, value) samples, producing smooth (not jumpy) motion."""
    if not samples:
        return str(fallback)
    if len(samples) == 1:
        return str(round(samples[0][1], 2))

    expr = str(round(samples[-1][1], 2))
    for i in range(len(samples) - 2, -1, -1):
        t0, v0 = samples[i]
        t1, v1 = samples[i + 1]
        if t1 <= t0:
            continue
        lerp = f"({v0:.2f}+({v1:.2f}-{v0:.2f})*(t-{t0:.2f})/{(t1 - t0):.4f})"
        expr = f"if(lt(t,{t1:.2f}),{lerp},{expr})"
    return expr


def build_framing_filter(
    src_w: int,
    src_h: int,
    out_w: int,
    out_h: int,
    crop_mode: str,
    face_samples: Optional[List[Tuple[float, float, float]]] = None,
    speaker_x_fracs: Optional[Tuple[float, float]] = None,
) -> str:
    """Return an ffmpeg filter chain (operating on [0:v]) that reframes the source
    video into out_w x out_h, honouring the requested crop_mode. face_samples is a
    list of (t_relative_seconds, center_x_fraction, center_y_fraction) used for
    auto-tracking; if empty, auto_track silently falls back to a center crop.
    speaker_x_fracs is an optional (left_speaker_x, right_speaker_x) pair of
    horizontal-position fractions used for the two-person split_screen layout;
    if omitted it defaults to the left third / right third of the frame."""
    if src_w <= 0 or src_h <= 0:
        src_w, src_h = out_w, out_h

    target_ratio = out_w / out_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        crop_h = src_h
        crop_w = round(src_h * target_ratio)
    else:
        crop_w = src_w
        crop_h = round(src_w / target_ratio)
    crop_w -= crop_w % 2
    crop_h -= crop_h % 2
    crop_w = max(2, min(crop_w, src_w))
    crop_h = max(2, min(crop_h, src_h))

    max_x = src_w - crop_w
    max_y = src_h - crop_h

    if crop_mode == "original":
        return (
            f"scale={out_w}:{out_h}:force_original_aspect_ratio=decrease,"
            f"pad={out_w}:{out_h}:(ow-iw)/2:(oh-ih)/2:color=black,"
            f"setsar=1"
        )

    if crop_mode == "blur_bg":
        return (
            f"split=2[__bg][__fg];"
            f"[__bg]scale={out_w}:{out_h}:force_original_aspect_ratio=increase,"
            f"crop={out_w}:{out_h},gblur=sigma=25[__bgblur];"
            f"[__fg]scale={out_w}:-2:force_original_aspect_ratio=decrease[__fgs];"
            f"[__bgblur][__fgs]overlay=(W-w)/2:(H-h)/2,setsar=1"
        )

    if crop_mode == "split_screen":
        # Two speakers side by side in the landscape source become a vertical
        # stack: top half = left speaker, bottom half = right speaker.
        half_out_h = out_h // 2
        sub_target_ratio = out_w / half_out_h
        if src_ratio > sub_target_ratio:
            sub_crop_h = src_h
            sub_crop_w = round(src_h * sub_target_ratio)
        else:
            sub_crop_w = src_w
            sub_crop_h = round(src_w / sub_target_ratio)
        sub_crop_w -= sub_crop_w % 2
        sub_crop_h -= sub_crop_h % 2
        sub_crop_w = max(2, min(sub_crop_w, src_w))
        sub_crop_h = max(2, min(sub_crop_h, src_h))
        sub_max_x = src_w - sub_crop_w

        left_frac, right_frac = speaker_x_fracs if speaker_x_fracs else (0.28, 0.72)
        left_x = max(0, min(round(left_frac * src_w - sub_crop_w / 2), sub_max_x))
        right_x = max(0, min(round(right_frac * src_w - sub_crop_w / 2), sub_max_x))
        return (
            f"split=2[__top][__bottom];"
            f"[__top]crop={sub_crop_w}:{sub_crop_h}:{left_x}:0,"
            f"scale={out_w}:{half_out_h}[__t2];"
            f"[__bottom]crop={sub_crop_w}:{sub_crop_h}:{right_x}:0,"
            f"scale={out_w}:{out_h - half_out_h}[__b2];"
            f"[__t2][__b2]vstack=inputs=2,setsar=1"
        )

    if crop_mode == "auto_track" and face_samples:
        x_samples = []
        y_samples = []
        for t, cx_frac, cy_frac in face_samples:
            cx = cx_frac * src_w - crop_w / 2
            cy = cy_frac * src_h - crop_h / 2
            cx = max(0, min(cx, max_x))
            cy = max(0, min(cy, max_y))
            x_samples.append((t, cx))
            y_samples.append((t, cy))
        x_expr = _build_interp_expr(x_samples, max_x / 2)
        y_expr = _build_interp_expr(y_samples, max_y / 2)
        return (
            f"crop={crop_w}:{crop_h}:'{x_expr}':'{y_expr}',"
            f"scale={out_w}:{out_h},setsar=1"
        )

    # center crop (also the fallback for auto_track with no detected faces)
    return f"crop={crop_w}:{crop_h}:{max_x // 2}:{max_y // 2},scale={out_w}:{out_h},setsar=1"


def build_subtitles_filter(ass_path: Path) -> str:
    return f"subtitles='{_escape_filter_path(str(ass_path))}'"


def build_drawtext_filter(
    textfile_path: Path,
    out_h: int,
    fontcolor: str = "white",
    fontsize: int = 54,
    y_position: str = "top",
    box: bool = True,
) -> str:
    y_expr = {
        "top": "h*0.06",
        "bottom": "h*0.85",
        "center": "(h-text_h)/2",
    }.get(y_position, "h*0.06")
    box_part = "box=1:boxcolor=black@0.45:boxborderw=16:" if box else ""
    return (
        f"drawtext=textfile='{_escape_filter_path(str(textfile_path))}':"
        f"fontcolor={fontcolor}:fontsize={fontsize}:{box_part}"
        f"x=(w-text_w)/2:y={y_expr}"
    )


def build_progress_bar_filter(bar_color: str = "red") -> str:
    return (
        f"drawbox=x=0:y=ih-10:w='iw*t/{{DURATION}}':h=10:color={bar_color}@0.9:t=fill"
    )


def build_watermark_overlay(watermark_path: Optional[Path], out_w: int, out_h: int) -> Optional[str]:
    if not watermark_path or not watermark_path.exists():
        return None
    margin = max(16, out_w // 40)
    return f"overlay=W-w-{margin}:H-h-{margin}:format=auto"


def render_clip(
    *,
    source_path: Path,
    output_path: Path,
    start: float,
    end: float,
    out_w: int,
    out_h: int,
    fps: int,
    crop_mode: str,
    src_w: int,
    src_h: int,
    face_samples: Optional[List[Tuple[float, float, float]]] = None,
    speaker_x_fracs: Optional[Tuple[float, float]] = None,
    ass_subtitle_path: Optional[Path] = None,
    title_textfile: Optional[Path] = None,
    progress_bar: bool = False,
    watermark_path: Optional[Path] = None,
    muted: bool = False,
    volume: float = 1.0,
    crf: int = 20,
    preset: str = "veryfast",
):
    _require_ffmpeg()
    duration = max(0.1, end - start)

    video_chain = build_framing_filter(src_w, src_h, out_w, out_h, crop_mode, face_samples, speaker_x_fracs)
    extra_video_steps = []
    if ass_subtitle_path is not None:
        extra_video_steps.append(build_subtitles_filter(ass_subtitle_path))
    if title_textfile is not None:
        extra_video_steps.append(build_drawtext_filter(title_textfile, out_h))
    if progress_bar:
        extra_video_steps.append(build_progress_bar_filter().replace("{DURATION}", f"{duration:.3f}"))
    extra_video_steps.append(f"fps={fps}")

    filter_complex_parts = [f"[0:v]{video_chain}[framed]"]
    last_label = "framed"
    for i, step in enumerate(extra_video_steps):
        next_label = f"v{i}"
        filter_complex_parts.append(f"[{last_label}]{step}[{next_label}]")
        last_label = next_label

    inputs: List[str] = ["-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(source_path)]

    overlay_filter = build_watermark_overlay(watermark_path, out_w, out_h)
    if overlay_filter:
        inputs += ["-i", str(watermark_path)]
        filter_complex_parts.append(f"[{last_label}][1:v]{overlay_filter}[vout]")
        last_label = "vout"
    else:
        filter_complex_parts.append(f"[{last_label}]null[vout]")
        last_label = "vout"

    filter_complex = ";".join(filter_complex_parts)

    args = [FFMPEG_BINARY, "-y"] + inputs
    args += ["-filter_complex", filter_complex, "-map", f"[{last_label}]"]

    if muted:
        args += ["-an"]
    else:
        args += ["-map", "0:a?"]
        if volume != 1.0:
            args += ["-af", f"volume={max(0.0, min(4.0, volume)):.2f}"]
        args += ["-c:a", "aac", "-b:a", "160k"]

    args += [
        "-c:v", "libx264",
        "-preset", preset,
        "-crf", str(crf),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(output_path),
    ]

    result = _run(args, timeout=1800)
    if result.returncode != 0 or not output_path.exists():
        raise FFmpegExecutionError(
            "FFmpeg failed to render this clip. See details for the underlying error.",
            stderr=result.stderr[-4000:],
        )


def cut_preview_clip(source_path: Path, output_path: Path, start: float, end: float):
    """Fast, low-quality stream-copy-ish cut used for the raw manual-selection preview."""
    _require_ffmpeg()
    args = [
        FFMPEG_BINARY, "-y",
        "-ss", f"{start:.3f}", "-to", f"{end:.3f}",
        "-i", str(source_path),
        "-vf", "scale=480:-2",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
        "-c:a", "aac", "-b:a", "96k",
        str(output_path),
    ]
    result = _run(args, timeout=300)
    if result.returncode != 0 or not output_path.exists():
        raise FFmpegExecutionError("Failed to create a preview clip.", stderr=result.stderr)
