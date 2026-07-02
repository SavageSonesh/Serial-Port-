import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import { StatusBadge } from "../components/clips/StatusBadge";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { useToast } from "../components/common/ToastProvider";
import { TranscriptPanel } from "../components/editor/TranscriptPanel";
import { usePolling } from "../hooks/usePolling";
import { formatDuration } from "../lib/utils";
import type {
  AspectRatio,
  Clip,
  FramingMode,
  Resolution,
  SubtitleStyleKey,
  Transcript,
} from "../types";

const CROP_OPTIONS: { value: FramingMode; label: string }[] = [
  { value: "auto_track", label: "Auto-track speaker" },
  { value: "center", label: "Centre crop" },
  { value: "blur_bg", label: "Blurred background" },
  { value: "split_screen", label: "Split-screen" },
  { value: "original", label: "Original fit" },
];

const SUBTITLE_STYLES: { value: SubtitleStyleKey; label: string }[] = [
  { value: "clean_minimal", label: "Clean Minimal" },
  { value: "bold_viral", label: "Bold Viral" },
  { value: "mrbeast", label: "MrBeast-style" },
  { value: "modern_white_yellow", label: "Modern White & Yellow" },
  { value: "karaoke", label: "Karaoke Word Highlight" },
  { value: "documentary", label: "Simple Documentary" },
];

export default function ClipEditor() {
  const { projectId, clipId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [clip, setClip] = useState<Clip | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [activeTime, setActiveTime] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    if (!clipId) return;
    api.getClip(clipId).then(setClip).catch((err) => toast.error(err.message));
  }, [clipId]);

  useEffect(() => {
    if (!projectId) return;
    api
      .transcript(projectId)
      .then(setTranscript)
      .catch(() => setTranscript(null));
  }, [projectId]);

  usePolling(
    async () => {
      if (!clipId) return;
      const c = await api.getClip(clipId);
      setClip(c);
    },
    2000,
    clip?.status === "rendering"
  );

  const patch = async (data: Partial<Clip> & { subtitle_settings?: object }, fieldKey: string) => {
    if (!clip) return;
    setSavingField(fieldKey);
    try {
      const updated = await api.updateClip(clip.id, data);
      setClip(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to save change.");
    } finally {
      setSavingField(null);
    }
  };

  const handleRegenerate = async () => {
    if (!clip) return;
    try {
      const updated = await api.regenerateClip(clip.id);
      setClip(updated);
      toast.info("Regenerating clip…");
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate clip.");
    }
  };

  const handleDelete = async () => {
    if (!clip) return;
    try {
      await api.deleteClip(clip.id);
      toast.success("Clip deleted.");
      navigate(`/projects/${projectId}/clips`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete clip.");
    }
  };

  const handleWatermarkUpload = async (file: File) => {
    if (!clip) return;
    try {
      const updated = await api.uploadWatermark(clip.id, file);
      setClip(updated);
      toast.success("Watermark uploaded.");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload watermark.");
    }
  };

  const seekToSource = (sourceTime: number) => {
    if (!clip || !videoRef.current) return;
    const relative = sourceTime - clip.start_time;
    if (relative < 0 || relative > clip.end_time - clip.start_time) {
      toast.info("That moment is outside this clip's current range.");
      return;
    }
    videoRef.current.currentTime = relative;
    videoRef.current.play().catch(() => {});
  };

  if (!clip) {
    return <div className="px-8 py-10 text-sm text-slate-500">Loading clip…</div>;
  }

  const subSettings = clip.subtitle_settings || {};

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/clips`)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">{clip.name}</h1>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <StatusBadge status={clip.status} />
              {clip.viral_score !== null && <span>Estimated engagement: {clip.viral_score}%</span>}
              {savingField && <span className="text-accent-glow">Saving…</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRegenerate}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            ↻ Regenerate
          </button>
          {clip.status === "ready" && (
            <a
              href={api.clipDownloadUrl(clip.id)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-soft"
            >
              Download
            </a>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px,1fr,320px]">
        <div className="panel overflow-hidden">
          <div className="flex aspect-[9/16] items-center justify-center bg-black">
            {clip.status === "ready" ? (
              <video
                ref={videoRef}
                src={api.clipVideoUrl(clip.id)}
                controls
                className="h-full w-full"
                onTimeUpdate={(e) => setActiveTime((e.target as HTMLVideoElement).currentTime)}
              />
            ) : (
              <div className="text-sm text-slate-500">
                {clip.status === "error" ? "Render failed" : "Clip is still rendering…"}
              </div>
            )}
          </div>
          {clip.status === "error" && clip.error_message && (
            <div className="border-t border-red-500/20 bg-red-950/30 px-4 py-3 text-xs text-red-300">
              {clip.error_message}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Clip Details</h3>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Name</label>
              <input
                defaultValue={clip.name}
                onBlur={(e) => e.target.value !== clip.name && patch({ name: e.target.value }, "name")}
                className="w-full rounded-md border border-white/10 bg-base-800 px-3 py-2 text-sm text-slate-200"
              />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Start ({formatDuration(clip.start_time)})
                </label>
                <input
                  type="number"
                  step={0.1}
                  defaultValue={clip.start_time}
                  onBlur={(e) => patch({ start_time: Number(e.target.value) }, "start_time")}
                  className="w-full rounded-md border border-white/10 bg-base-800 px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  End ({formatDuration(clip.end_time)})
                </label>
                <input
                  type="number"
                  step={0.1}
                  defaultValue={clip.end_time}
                  onBlur={(e) => patch({ end_time: Number(e.target.value) }, "end_time")}
                  className="w-full rounded-md border border-white/10 bg-base-800 px-3 py-2 text-sm text-slate-200"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Aspect</label>
                <select
                  value={clip.aspect_ratio}
                  onChange={(e) => patch({ aspect_ratio: e.target.value as AspectRatio }, "aspect_ratio")}
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-xs text-slate-200"
                >
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Resolution</label>
                <select
                  value={clip.resolution}
                  onChange={(e) => patch({ resolution: e.target.value as Resolution }, "resolution")}
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-xs text-slate-200"
                >
                  <option value="1080x1920">1080×1920</option>
                  <option value="720x1280">720×1280</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">FPS</label>
                <select
                  value={clip.fps}
                  onChange={(e) => patch({ fps: Number(e.target.value) }, "fps")}
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-xs text-slate-200"
                >
                  <option value={24}>24</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Crop / framing</label>
              <select
                value={clip.crop_mode}
                onChange={(e) => patch({ crop_mode: e.target.value as FramingMode }, "crop_mode")}
                className="w-full rounded-md border border-white/10 bg-base-800 px-3 py-2 text-sm text-slate-200"
              >
                {CROP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Subtitles</h3>
            <label className="mb-3 flex items-center justify-between text-sm text-slate-300">
              Enabled
              <input
                type="checkbox"
                checked={clip.subtitles_enabled}
                onChange={(e) => patch({ subtitles_enabled: e.target.checked }, "subtitles_enabled")}
                className="h-4 w-4 accent-[#7c5cff]"
              />
            </label>
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Style</label>
              <select
                value={clip.subtitle_style}
                onChange={(e) => patch({ subtitle_style: e.target.value as SubtitleStyleKey }, "subtitle_style")}
                className="w-full rounded-md border border-white/10 bg-base-800 px-3 py-2 text-sm text-slate-200"
              >
                {SUBTITLE_STYLES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Font size</label>
                <input
                  type="number"
                  defaultValue={subSettings.font_size ?? 64}
                  onBlur={(e) =>
                    patch({ subtitle_settings: { ...subSettings, font_size: Number(e.target.value) } }, "font_size")
                  }
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Max words / line</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  defaultValue={subSettings.max_words ?? 4}
                  onBlur={(e) =>
                    patch({ subtitle_settings: { ...subSettings, max_words: Number(e.target.value) } }, "max_words")
                  }
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Text colour</label>
                <input
                  type="color"
                  defaultValue={subSettings.text_color ?? "#ffffff"}
                  onBlur={(e) =>
                    patch({ subtitle_settings: { ...subSettings, text_color: e.target.value } }, "text_color")
                  }
                  className="h-9 w-full rounded-md border border-white/10 bg-base-800"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Highlight colour</label>
                <input
                  type="color"
                  defaultValue={subSettings.highlight_color ?? "#ffd400"}
                  onBlur={(e) =>
                    patch({ subtitle_settings: { ...subSettings, highlight_color: e.target.value } }, "highlight_color")
                  }
                  className="h-9 w-full rounded-md border border-white/10 bg-base-800"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Position</label>
                <select
                  defaultValue={subSettings.position ?? "bottom"}
                  onChange={(e) => patch({ subtitle_settings: { ...subSettings, position: e.target.value } }, "position")}
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-xs text-slate-200"
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Capitalization</label>
                <select
                  defaultValue={subSettings.capitalization ?? "none"}
                  onChange={(e) =>
                    patch({ subtitle_settings: { ...subSettings, capitalization: e.target.value } }, "capitalization")
                  }
                  className="w-full rounded-md border border-white/10 bg-base-800 px-2 py-2 text-xs text-slate-200"
                >
                  <option value="none">Normal</option>
                  <option value="upper">UPPERCASE</option>
                  <option value="sentence">Sentence case</option>
                </select>
              </div>
            </div>

            <label className="mt-3 flex items-center justify-between text-sm text-slate-300">
              Remove filler words
              <input
                type="checkbox"
                checked={clip.remove_filler_words}
                onChange={(e) => patch({ remove_filler_words: e.target.checked }, "remove_filler_words")}
                className="h-4 w-4 accent-[#7c5cff]"
              />
            </label>

            <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
              {clip.srt_path && (
                <a href={api.clipSrtUrl(clip.id)} className="flex-1 rounded-md border border-white/10 py-1.5 text-center text-xs text-slate-300 hover:bg-white/5">
                  Export .SRT
                </a>
              )}
              {clip.vtt_path && (
                <a href={api.clipVttUrl(clip.id)} className="flex-1 rounded-md border border-white/10 py-1.5 text-center text-xs text-slate-300 hover:bg-white/5">
                  Export .VTT
                </a>
              )}
            </div>
          </section>

          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Title, Progress Bar &amp; Watermark</h3>
            <label className="mb-2 flex items-center justify-between text-sm text-slate-300">
              Title overlay
              <input
                type="checkbox"
                checked={clip.title_enabled}
                onChange={(e) => patch({ title_enabled: e.target.checked }, "title_enabled")}
                className="h-4 w-4 accent-[#7c5cff]"
              />
            </label>
            <input
              defaultValue={clip.title_text ?? ""}
              onBlur={(e) => patch({ title_text: e.target.value }, "title_text")}
              placeholder="Title text shown at the top of the clip"
              className="mb-2 w-full rounded-md border border-white/10 bg-base-800 px-3 py-2 text-sm text-slate-200"
            />
            {clip.title_suggestions && clip.title_suggestions.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {clip.title_suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => patch({ title_text: s, title_enabled: true }, "title_text")}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400 hover:border-accent hover:text-accent-glow"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <label className="mb-4 flex items-center justify-between text-sm text-slate-300">
              Progress bar
              <input
                type="checkbox"
                checked={clip.progress_bar_enabled}
                onChange={(e) => patch({ progress_bar_enabled: e.target.checked }, "progress_bar_enabled")}
                className="h-4 w-4 accent-[#7c5cff]"
              />
            </label>

            <label className="mb-2 flex items-center justify-between text-sm text-slate-300">
              Watermark / logo
              <input
                type="checkbox"
                checked={clip.watermark_enabled}
                onChange={(e) => patch({ watermark_enabled: e.target.checked }, "watermark_enabled")}
                className="h-4 w-4 accent-[#7c5cff]"
              />
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => e.target.files && handleWatermarkUpload(e.target.files[0])}
              className="w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-base-800 file:px-3 file:py-1.5 file:text-xs file:text-slate-300"
            />
          </section>
        </div>

        <div className="space-y-5">
          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Audio</h3>
            <label className="mb-3 flex items-center justify-between text-sm text-slate-300">
              Mute audio
              <input
                type="checkbox"
                checked={clip.muted}
                onChange={(e) => patch({ muted: e.target.checked }, "muted")}
                className="h-4 w-4 accent-[#7c5cff]"
              />
            </label>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Volume ({Math.round(clip.volume * 100)}%)
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              defaultValue={clip.volume}
              onMouseUp={(e) => patch({ volume: Number((e.target as HTMLInputElement).value) }, "volume")}
              onTouchEnd={(e) => patch({ volume: Number((e.target as HTMLInputElement).value) }, "volume")}
              disabled={clip.muted}
              className="w-full accent-[#7c5cff]"
            />
          </section>

          <div className="h-[420px]">
            <TranscriptPanel
              transcript={transcript}
              clipStart={clip.start_time}
              clipEnd={clip.end_time}
              activeTime={activeTime}
              onSeek={seekToSource}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this clip?"
        message={`"${clip.name}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
