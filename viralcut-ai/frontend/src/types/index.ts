export type ProjectStatus =
  | "uploading"
  | "uploaded"
  | "processing"
  | "ready"
  | "error";

export type ProcessingStage =
  | "uploaded"
  | "reading_video"
  | "extracting_audio"
  | "transcribing_speech"
  | "analyzing_moments"
  | "selecting_clips"
  | "detecting_speakers"
  | "creating_subtitles"
  | "rendering_previews"
  | "exporting_final_clips"
  | "done"
  | "";

export interface Project {
  id: string;
  name: string;
  original_filename: string;
  thumbnail_path: string | null;
  duration: number;
  width: number;
  height: number;
  fps: number;
  file_size: number;
  status: ProjectStatus;
  stage: ProcessingStage;
  progress: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  clip_count: number;
}

export interface ProjectStatusPayload {
  id: string;
  status: ProjectStatus;
  stage: ProcessingStage;
  progress: number;
  error_message: string | null;
}

export type GenerationMode = "viral" | "random" | "manual";
export type DurationPreset = "15-30" | "30-45" | "45-60" | "custom";
export type AspectRatio = "9:16" | "1:1" | "16:9";
export type Resolution = "1080x1920" | "720x1280";
export type FramingMode = "auto_track" | "center" | "blur_bg" | "split_screen" | "original";
export type SubtitleStyleKey =
  | "clean_minimal"
  | "bold_viral"
  | "mrbeast"
  | "modern_white_yellow"
  | "karaoke"
  | "documentary";

export interface GenerationSettings {
  mode: GenerationMode;
  num_clips: number;
  duration_preset: DurationPreset;
  custom_min_duration?: number;
  custom_max_duration?: number;
  aspect_ratio: AspectRatio;
  resolution: Resolution;
  fps: number;
  framing: FramingMode;
  subtitle_style: SubtitleStyleKey;
  subtitles_enabled: boolean;
  remove_filler_words: boolean;
  allow_overlapping_clips: boolean;
  manual_ranges?: number[][];
}

export interface SubtitleSettings {
  font_size: number;
  font_weight: string;
  text_color: string;
  highlight_color: string;
  background: string;
  position: string;
  capitalization: string;
  max_words: number;
}

export type ClipStatus = "pending" | "rendering" | "ready" | "error";

export interface Clip {
  id: string;
  project_id: string;
  name: string;
  mode: GenerationMode;
  start_time: number;
  end_time: number;
  viral_score: number | null;
  score_breakdown: Record<string, number> | null;
  aspect_ratio: AspectRatio;
  resolution: Resolution;
  fps: number;
  crop_mode: FramingMode;
  subtitle_style: SubtitleStyleKey;
  subtitle_settings: Partial<SubtitleSettings> | null;
  subtitles_enabled: boolean;
  remove_filler_words: boolean;
  title_text: string | null;
  title_enabled: boolean;
  title_suggestions: string[] | null;
  progress_bar_enabled: boolean;
  watermark_enabled: boolean;
  muted: boolean;
  volume: number;
  status: ClipStatus;
  progress: number;
  error_message: string | null;
  output_path: string | null;
  thumbnail_path: string | null;
  srt_path: string | null;
  vtt_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
}

export interface Transcript {
  language: string | null;
  segments: TranscriptSegment[];
  full_text: string;
}

export interface HealthStatus {
  status: string;
  privacy_notice: string;
  ffmpeg_installed: boolean;
  whisper_available: boolean;
  whisper_error: string | null;
}
