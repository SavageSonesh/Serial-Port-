"""
Builds animated subtitles from word-level transcript timing.

Produces:
- an .ass file (used to burn subtitles into the rendered clip via ffmpeg's
  `subtitles` filter, with per-word highlight override tags for styles that
  need it)
- plain .srt / .vtt files for export, independent of visual styling
"""
import re
from pathlib import Path
from typing import List, Optional

FILLER_TOKENS = {"um", "uh", "erm", "hmm", "uhh", "umm"}
FILLER_PHRASES = ["you know", "sort of", "kind of", "i mean"]

DEFAULT_SUBTITLE_SETTINGS = {
    "font_size": 64,
    "font_weight": "bold",
    "text_color": "#FFFFFF",
    "highlight_color": "#FFD400",
    "background": "translucent",  # none | translucent | solid
    "position": "bottom",  # top | center | bottom
    "capitalization": "none",  # none | upper | sentence
    "max_words": 4,
}

STYLE_PRESETS = {
    "clean_minimal": {
        "font_size": 56, "font_weight": "regular", "text_color": "#FFFFFF",
        "highlight_color": "#FFFFFF", "background": "none", "outline": 2, "per_word_highlight": False,
    },
    "bold_viral": {
        "font_size": 74, "font_weight": "black", "text_color": "#FFFFFF",
        "highlight_color": "#FFD400", "background": "none", "outline": 5, "per_word_highlight": False,
    },
    "mrbeast": {
        "font_size": 80, "font_weight": "black", "text_color": "#FFFFFF",
        "highlight_color": "#00FF3C", "background": "none", "outline": 6, "per_word_highlight": True,
        "capitalization": "upper",
    },
    "modern_white_yellow": {
        "font_size": 66, "font_weight": "bold", "text_color": "#FFFFFF",
        "highlight_color": "#FFD400", "background": "translucent", "outline": 3, "per_word_highlight": True,
    },
    "karaoke": {
        "font_size": 66, "font_weight": "bold", "text_color": "#FFFFFF",
        "highlight_color": "#00E5FF", "background": "none", "outline": 3, "per_word_highlight": True,
    },
    "documentary": {
        "font_size": 48, "font_weight": "regular", "text_color": "#FFFFFF",
        "highlight_color": "#FFFFFF", "background": "solid", "outline": 1, "per_word_highlight": False,
    },
}


def merge_settings(style: str, overrides: Optional[dict]) -> dict:
    base = dict(DEFAULT_SUBTITLE_SETTINGS)
    base.update(STYLE_PRESETS.get(style, STYLE_PRESETS["bold_viral"]))
    if overrides:
        base.update({k: v for k, v in overrides.items() if v is not None})
    return base


def _hex_to_ass_color(hex_color: str) -> str:
    hex_color = (hex_color or "#FFFFFF").lstrip("#")
    if len(hex_color) != 6:
        hex_color = "FFFFFF"
    r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
    return f"&H00{b}{g}{r}".upper()


def _ass_time(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _srt_time(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _vtt_time(seconds: float) -> str:
    return _srt_time(seconds).replace(",", ".")


def should_remove_fillers(words: List[dict]) -> bool:
    tokens = [w["word"].strip(".,!?").lower() for w in words]
    non_filler = [t for t in tokens if t not in FILLER_TOKENS]
    if not tokens:
        return False
    ratio_kept = len(non_filler) / len(tokens)
    return ratio_kept >= 0.6 and len(non_filler) >= 3


def filter_filler_words(words: List[dict], enabled: bool) -> List[dict]:
    if not enabled or not words:
        return words
    if not should_remove_fillers(words):
        return words
    cleaned = [w for w in words if w["word"].strip(".,!?").lower() not in FILLER_TOKENS]
    return cleaned or words


def _apply_capitalization(text: str, mode: str) -> str:
    if mode == "upper":
        return text.upper()
    if mode == "sentence":
        return text[:1].upper() + text[1:] if text else text
    return text


def chunk_words(words: List[dict], max_words: int) -> List[List[dict]]:
    max_words = max(1, min(6, max_words))
    chunks = []
    current: List[dict] = []
    for w in words:
        current.append(w)
        ends_sentence = bool(re.search(r"[.!?]$", w["word"].strip()))
        if len(current) >= max_words or ends_sentence:
            chunks.append(current)
            current = []
    if current:
        chunks.append(current)
    return chunks


def build_ass(
    words: List[dict],
    settings: dict,
    out_w: int,
    out_h: int,
    out_path: Path,
    clip_start_offset: float,
):
    """words are absolute-timestamped (source video time); clip_start_offset is
    subtracted so subtitle timing is relative to the rendered clip."""
    font_size = int(settings.get("font_size", 64))
    weight = settings.get("font_weight", "bold")
    bold_flag = -1 if weight in ("bold", "black") else 0
    primary = _hex_to_ass_color(settings.get("text_color", "#FFFFFF"))
    highlight = _hex_to_ass_color(settings.get("highlight_color", "#FFD400"))
    outline = int(settings.get("outline", 3))
    background = settings.get("background", "none")
    position = settings.get("position", "bottom")
    capitalization = settings.get("capitalization", "none")
    max_words = int(settings.get("max_words", 4))
    per_word_highlight = bool(settings.get("per_word_highlight", False))

    alignment = {"top": 8, "center": 5, "bottom": 2}.get(position, 2)
    margin_v = int(out_h * 0.10)
    back_colour = "&H80000000" if background == "translucent" else ("&H00000000" if background == "solid" else "&H00000000")
    border_style = 3 if background == "solid" else 1

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {out_w}
PlayResY: {out_h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,{font_size},{primary},{highlight},&H00000000,{back_colour},{bold_flag},0,0,0,100,100,0,0,{border_style},{outline},1,{alignment},60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    lines = [header]
    chunks = chunk_words(words, max_words)

    for chunk in chunks:
        chunk_start = chunk[0]["start"] - clip_start_offset
        chunk_end = chunk[-1]["end"] - clip_start_offset
        if chunk_end <= 0:
            continue
        chunk_start = max(0.0, chunk_start)

        if not per_word_highlight:
            text = " ".join(_apply_capitalization(w["word"], capitalization) for w in chunk)
            lines.append(
                f"Dialogue: 0,{_ass_time(chunk_start)},{_ass_time(chunk_end)},Default,,0,0,0,,{text}\n"
            )
            continue

        # one event per word so the active word is visually highlighted while spoken
        for idx, active_word in enumerate(chunk):
            w_start = max(0.0, active_word["start"] - clip_start_offset)
            w_end = max(w_start + 0.05, active_word["end"] - clip_start_offset)
            parts = []
            for j, w in enumerate(chunk):
                word_text = _apply_capitalization(w["word"], capitalization)
                if j == idx:
                    parts.append(f"{{\\c{highlight}\\fscx112\\fscy112}}{word_text}{{\\c{primary}\\fscx100\\fscy100}}")
                else:
                    parts.append(word_text)
            text = " ".join(parts)
            lines.append(
                f"Dialogue: 0,{_ass_time(w_start)},{_ass_time(w_end)},Default,,0,0,0,,{text}\n"
            )

    out_path.write_text("".join(lines), encoding="utf-8")
    return out_path


def build_srt(words: List[dict], max_words: int, out_path: Path, clip_start_offset: float = 0.0, capitalization: str = "none"):
    chunks = chunk_words(words, max_words)
    lines = []
    for i, chunk in enumerate(chunks, start=1):
        start = max(0.0, chunk[0]["start"] - clip_start_offset)
        end = max(start + 0.05, chunk[-1]["end"] - clip_start_offset)
        text = " ".join(_apply_capitalization(w["word"], capitalization) for w in chunk)
        lines.append(f"{i}\n{_srt_time(start)} --> {_srt_time(end)}\n{text}\n")
    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


def build_vtt(words: List[dict], max_words: int, out_path: Path, clip_start_offset: float = 0.0, capitalization: str = "none"):
    chunks = chunk_words(words, max_words)
    lines = ["WEBVTT\n"]
    for chunk in chunks:
        start = max(0.0, chunk[0]["start"] - clip_start_offset)
        end = max(start + 0.05, chunk[-1]["end"] - clip_start_offset)
        text = " ".join(_apply_capitalization(w["word"], capitalization) for w in chunk)
        lines.append(f"{_vtt_time(start)} --> {_vtt_time(end)}\n{text}\n")
    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


def words_in_range(segments: List[dict], start: float, end: float) -> List[dict]:
    words = []
    for seg in segments:
        for w in seg.get("words", []):
            if w["end"] > start and w["start"] < end:
                words.append(w)
    return words
