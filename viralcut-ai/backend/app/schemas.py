"""Pydantic request/response schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ProjectOut(BaseModel):
    id: str
    name: str
    original_filename: str
    thumbnail_path: Optional[str] = None
    duration: float
    width: int
    height: int
    fps: float
    file_size: int
    status: str
    stage: str
    progress: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    clip_count: int = 0

    class Config:
        from_attributes = True


class ProjectStatusOut(BaseModel):
    id: str
    status: str
    stage: str
    progress: int
    error_message: Optional[str] = None


class GenerationSettings(BaseModel):
    mode: str = Field("viral", pattern="^(viral|random|manual)$")
    num_clips: int = Field(5, ge=1, le=20)
    duration_preset: str = Field("30-45", pattern="^(15-30|30-45|45-60|custom)$")
    custom_min_duration: Optional[float] = None
    custom_max_duration: Optional[float] = None
    aspect_ratio: str = Field("9:16", pattern="^(9:16|1:1|16:9)$")
    resolution: str = Field("1080x1920", pattern="^(1080x1920|720x1280)$")
    fps: int = Field(30, description="24, 30 or 60")
    framing: str = Field("auto_track", pattern="^(auto_track|center|blur_bg|split_screen|original)$")
    subtitle_style: str = Field("bold_viral")
    subtitles_enabled: bool = True
    remove_filler_words: bool = False
    allow_overlapping_clips: bool = False
    manual_ranges: Optional[List[List[float]]] = None  # for manual mode: [[start, end], ...]


class ClipUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    aspect_ratio: Optional[str] = None
    resolution: Optional[str] = None
    fps: Optional[int] = None
    crop_mode: Optional[str] = None
    subtitle_style: Optional[str] = None
    subtitle_settings: Optional[dict] = None
    subtitles_enabled: Optional[bool] = None
    remove_filler_words: Optional[bool] = None
    title_text: Optional[str] = None
    title_enabled: Optional[bool] = None
    progress_bar_enabled: Optional[bool] = None
    watermark_enabled: Optional[bool] = None
    muted: Optional[bool] = None
    volume: Optional[float] = None


class ClipOut(BaseModel):
    id: str
    project_id: str
    name: str
    mode: str
    start_time: float
    end_time: float
    viral_score: Optional[int] = None
    score_breakdown: Optional[dict] = None
    aspect_ratio: str
    resolution: str
    fps: int
    crop_mode: str
    subtitle_style: str
    subtitle_settings: Optional[dict] = None
    subtitles_enabled: bool
    remove_filler_words: bool
    title_text: Optional[str] = None
    title_enabled: bool
    title_suggestions: Optional[List[str]] = None
    progress_bar_enabled: bool
    watermark_enabled: bool
    muted: bool
    volume: float
    status: str
    progress: int
    error_message: Optional[str] = None
    output_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    srt_path: Optional[str] = None
    vtt_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TranscriptWord(BaseModel):
    word: str
    start: float
    end: float


class TranscriptSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: List[TranscriptWord] = []


class TranscriptOut(BaseModel):
    language: Optional[str] = None
    segments: List[TranscriptSegment]
    full_text: str = ""
