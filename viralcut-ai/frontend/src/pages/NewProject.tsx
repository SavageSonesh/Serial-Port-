import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api } from "../api/client";
import { useToast } from "../components/common/ToastProvider";
import { Dropzone } from "../components/upload/Dropzone";
import { OptionCard } from "../components/upload/OptionCard";
import { Timeline } from "../components/video/Timeline";
import { formatBytes, formatDuration } from "../lib/utils";
import type {
  AspectRatio,
  DurationPreset,
  FramingMode,
  GenerationMode,
  GenerationSettings,
  Project,
  Resolution,
  SubtitleStyleKey,
} from "../types";

const DEFAULT_SETTINGS: GenerationSettings = {
  mode: "viral",
  num_clips: 5,
  duration_preset: "30-45",
  aspect_ratio: "9:16",
  resolution: "1080x1920",
  fps: 30,
  framing: "auto_track",
  subtitle_style: "bold_viral",
  subtitles_enabled: true,
  remove_filler_words: false,
  allow_overlapping_clips: false,
  manual_ranges: [],
};

const MODE_OPTIONS: { value: GenerationMode; label: string; description: string }[] = [
  { value: "viral", label: "Viral Moments", description: "Auto-detect hooks, emotion, stories & more" },
  { value: "random", label: "Random Clips", description: "Random sections, skipping silence" },
  { value: "manual", label: "Manual Selection", description: "Pick start/end points yourself" },
];

const DURATION_OPTIONS: { value: DurationPreset; label: string }[] = [
  { value: "15-30", label: "15–30s" },
  { value: "30-45", label: "30–45s" },
  { value: "45-60", label: "45–60s" },
  { value: "custom", label: "Custom" },
];

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "9:16", label: "9:16 Vertical" },
  { value: "1:1", label: "1:1 Square" },
  { value: "16:9", label: "16:9 Landscape" },
];

const RESOLUTION_OPTIONS: { value: Resolution; label: string }[] = [
  { value: "1080x1920", label: "1080 × 1920" },
  { value: "720x1280", label: "720 × 1280" },
];

const FRAMING_OPTIONS: { value: FramingMode; label: string }[] = [
  { value: "auto_track", label: "Auto-track speaker" },
  { value: "center", label: "Centre crop" },
  { value: "blur_bg", label: "Blurred background" },
  { value: "split_screen", label: "Split-screen (2 speakers)" },
  { value: "original", label: "Original video fit" },
];

const SUBTITLE_STYLE_OPTIONS: { value: SubtitleStyleKey; label: string }[] = [
  { value: "clean_minimal", label: "Clean Minimal" },
  { value: "bold_viral", label: "Bold Viral" },
  { value: "mrbeast", label: "MrBeast-style" },
  { value: "modern_white_yellow", label: "Modern White & Yellow" },
  { value: "karaoke", label: "Karaoke Word Highlight" },
  { value: "documentary", label: "Simple Documentary" },
];

export default function NewProject() {
  const [searchParams] = useSearchParams();
  const existingProjectId = searchParams.get("project");
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [starting, setStarting] = useState(false);

  const [manualRanges, setManualRanges] = useState<{ start: number; end: number }[]>([]);
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (existingProjectId) {
      api
        .getProject(existingProjectId)
        .then(setProject)
        .catch((err) => toast.error(err.message || "Could not load this project."));
    }
  }, [existingProjectId]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const created = await api.uploadProject(file, setUploadProgress);
      setProject(created);
      toast.success("Video uploaded successfully.");
    } catch (err: any) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const markStart = () => setPendingStart(currentTime);
  const markEndAndAdd = () => {
    if (pendingStart === null) {
      toast.error("Set a start point first.");
      return;
    }
    if (currentTime <= pendingStart) {
      toast.error("End time must be after the start time.");
      return;
    }
    setManualRanges((prev) => [...prev, { start: pendingStart, end: currentTime }]);
    setPendingStart(null);
  };
  const removeRange = (idx: number) => setManualRanges((prev) => prev.filter((_, i) => i !== idx));

  const canGenerate =
    !!project &&
    !starting &&
    (settings.mode !== "manual" || manualRanges.length > 0);

  const handleGenerate = async () => {
    if (!project) return;
    setStarting(true);
    try {
      const payload: GenerationSettings = {
        ...settings,
        manual_ranges: manualRanges.map((r) => [r.start, r.end]),
        num_clips: settings.mode === "manual" ? Math.min(20, Math.max(1, manualRanges.length)) : settings.num_clips,
      };
      await api.startProcessing(project.id, payload);
      navigate(`/projects/${project.id}/processing`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start processing.");
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-2xl font-semibold text-white">New Project</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your videos are processed locally and are not uploaded to an external server.
      </p>

      {!project && (
        <div className="mt-8 max-w-2xl">
          <Dropzone onFileSelected={handleFile} disabled={uploading} />
          {uploading && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-base-800">
                <div className="h-full bg-accent transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {project && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr,1fr]">
          <div>
            <div className="panel overflow-hidden">
              <video
                ref={videoRef}
                src={api.projectVideoUrl(project.id)}
                controls
                className="max-h-[420px] w-full bg-black"
                onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
              />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-slate-400">
              <div className="panel px-3 py-2">
                <div className="text-slate-500">File</div>
                <div className="truncate text-slate-200">{project.original_filename}</div>
              </div>
              <div className="panel px-3 py-2">
                <div className="text-slate-500">Duration</div>
                <div className="text-slate-200">{formatDuration(project.duration)}</div>
              </div>
              <div className="panel px-3 py-2">
                <div className="text-slate-500">Resolution</div>
                <div className="text-slate-200">
                  {project.width}×{project.height}
                </div>
              </div>
              <div className="panel px-3 py-2">
                <div className="text-slate-500">Size</div>
                <div className="text-slate-200">{formatBytes(project.file_size)}</div>
              </div>
            </div>

            <div className="panel mt-6 p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">1. Generation Mode</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                {MODE_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    active={settings.mode === opt.value}
                    onClick={() => setSettings((s) => ({ ...s, mode: opt.value }))}
                  />
                ))}
              </div>

              {settings.mode === "manual" && (
                <div className="mt-5 border-t border-white/5 pt-5">
                  <h4 className="mb-2 text-sm font-medium text-slate-200">Select clip ranges on the timeline</h4>
                  <Timeline
                    duration={project.duration}
                    currentTime={currentTime}
                    ranges={manualRanges.map((r) => ({ ...r, color: "#7c5cff" }))}
                    markerStart={pendingStart ?? undefined}
                    markerEnd={pendingStart !== null ? currentTime : undefined}
                    onSeek={seekTo}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={markStart}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                    >
                      Set Start ({formatDuration(currentTime)})
                    </button>
                    <button
                      onClick={markEndAndAdd}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-soft"
                    >
                      Set End &amp; Add Range
                    </button>
                    {pendingStart !== null && (
                      <span className="text-xs text-slate-500">Start marked at {formatDuration(pendingStart)}</span>
                    )}
                  </div>
                  {manualRanges.length > 0 && (
                    <ul className="mt-4 space-y-1.5">
                      {manualRanges.map((r, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-md bg-base-800 px-3 py-1.5 text-xs text-slate-300"
                        >
                          <span>
                            Clip {i + 1}: {formatDuration(r.start)} → {formatDuration(r.end)} (
                            {formatDuration(r.end - r.start)})
                          </span>
                          <button onClick={() => removeRange(i)} className="text-red-400 hover:text-red-300">
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="panel h-fit p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">2. Clip Settings</h3>

            {settings.mode !== "manual" && (
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Number of clips: {settings.num_clips}
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={settings.num_clips}
                  onChange={(e) => setSettings((s) => ({ ...s, num_clips: Number(e.target.value) }))}
                  className="w-full accent-[#7c5cff]"
                />
              </div>
            )}

            {settings.mode !== "manual" && (
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Clip duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      label={opt.label}
                      active={settings.duration_preset === opt.value}
                      onClick={() => setSettings((s) => ({ ...s, duration_preset: opt.value }))}
                    />
                  ))}
                </div>
                {settings.duration_preset === "custom" && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Min sec"
                      value={settings.custom_min_duration ?? ""}
                      onChange={(e) => setSettings((s) => ({ ...s, custom_min_duration: Number(e.target.value) }))}
                      className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-1.5 text-xs text-slate-200"
                    />
                    <span className="text-slate-500">–</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="Max sec"
                      value={settings.custom_max_duration ?? ""}
                      onChange={(e) => setSettings((s) => ({ ...s, custom_max_duration: Number(e.target.value) }))}
                      className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Output format</label>
              <select
                value={settings.aspect_ratio}
                onChange={(e) => setSettings((s) => ({ ...s, aspect_ratio: e.target.value as AspectRatio }))}
                className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-sm text-slate-200"
              >
                {ASPECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Resolution</label>
                <select
                  value={settings.resolution}
                  onChange={(e) => setSettings((s) => ({ ...s, resolution: e.target.value as Resolution }))}
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-sm text-slate-200"
                >
                  {RESOLUTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Frame rate</label>
                <select
                  value={settings.fps}
                  onChange={(e) => setSettings((s) => ({ ...s, fps: Number(e.target.value) }))}
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-sm text-slate-200"
                >
                  {[24, 30, 60].map((f) => (
                    <option key={f} value={f}>
                      {f} FPS
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Framing</label>
              <select
                value={settings.framing}
                onChange={(e) => setSettings((s) => ({ ...s, framing: e.target.value as FramingMode }))}
                className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-sm text-slate-200"
              >
                {FRAMING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Subtitle style</label>
              <select
                value={settings.subtitle_style}
                onChange={(e) => setSettings((s) => ({ ...s, subtitle_style: e.target.value as SubtitleStyleKey }))}
                className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-sm text-slate-200"
              >
                {SUBTITLE_STYLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2.5 border-t border-white/5 pt-4">
              <label className="flex items-center justify-between text-sm text-slate-300">
                Burn in subtitles
                <input
                  type="checkbox"
                  checked={settings.subtitles_enabled}
                  onChange={(e) => setSettings((s) => ({ ...s, subtitles_enabled: e.target.checked }))}
                  className="h-4 w-4 accent-[#7c5cff]"
                />
              </label>
              <label className="flex items-center justify-between text-sm text-slate-300">
                Remove filler words (um, uh, like…)
                <input
                  type="checkbox"
                  checked={settings.remove_filler_words}
                  onChange={(e) => setSettings((s) => ({ ...s, remove_filler_words: e.target.checked }))}
                  className="h-4 w-4 accent-[#7c5cff]"
                />
              </label>
              <label className="flex items-center justify-between text-sm text-slate-300">
                Allow overlapping clips
                <input
                  type="checkbox"
                  checked={settings.allow_overlapping_clips}
                  onChange={(e) => setSettings((s) => ({ ...s, allow_overlapping_clips: e.target.checked }))}
                  className="h-4 w-4 accent-[#7c5cff]"
                />
              </label>
            </div>

            <button
              disabled={!canGenerate}
              onClick={handleGenerate}
              className="mt-6 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              {starting ? "Starting…" : "Generate Clips"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
