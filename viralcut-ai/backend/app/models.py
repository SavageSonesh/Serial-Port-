"""SQLAlchemy ORM models for projects and clips."""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def new_id() -> str:
    return uuid.uuid4().hex


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    video_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)

    duration = Column(Float, default=0.0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    fps = Column(Float, default=0.0)
    file_size = Column(Integer, default=0)

    # uploaded -> transcribing -> analyzing -> selecting -> rendering -> ready -> error
    status = Column(String, default="uploaded")
    stage = Column(String, default="")
    progress = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    transcript_path = Column(String, nullable=True)
    face_track_path = Column(String, nullable=True)

    settings_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    clips = relationship("Clip", back_populates="project", cascade="all, delete-orphan")


class Clip(Base):
    __tablename__ = "clips"

    id = Column(String, primary_key=True, default=new_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)

    name = Column(String, default="Untitled Clip")
    mode = Column(String, default="manual")  # viral | random | manual

    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)

    viral_score = Column(Integer, nullable=True)
    score_breakdown_json = Column(Text, nullable=True)

    aspect_ratio = Column(String, default="9:16")
    resolution = Column(String, default="1080x1920")
    fps = Column(Integer, default=30)
    crop_mode = Column(String, default="center")  # auto_track | center | blur_bg | split_screen | original

    subtitle_style = Column(String, default="bold_viral")
    subtitle_settings_json = Column(Text, nullable=True)
    subtitles_enabled = Column(Boolean, default=True)
    remove_filler_words = Column(Boolean, default=False)

    title_text = Column(String, nullable=True)
    title_enabled = Column(Boolean, default=False)
    title_suggestions_json = Column(Text, nullable=True)

    progress_bar_enabled = Column(Boolean, default=False)
    watermark_enabled = Column(Boolean, default=False)
    watermark_path = Column(String, nullable=True)

    muted = Column(Boolean, default=False)
    volume = Column(Float, default=1.0)

    status = Column(String, default="pending")  # pending | rendering | ready | error
    progress = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    output_path = Column(String, nullable=True)
    preview_path = Column(String, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    srt_path = Column(String, nullable=True)
    vtt_path = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="clips")
