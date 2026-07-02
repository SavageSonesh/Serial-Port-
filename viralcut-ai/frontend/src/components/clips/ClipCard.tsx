import { useNavigate } from "react-router-dom";

import { api } from "../../api/client";
import { formatDuration } from "../../lib/utils";
import type { Clip } from "../../types";
import { StatusBadge } from "./StatusBadge";

interface ClipCardProps {
  clip: Clip;
  projectId: string;
  onDelete: (clip: Clip) => void;
  onRegenerate: (clip: Clip) => void;
}

export function ClipCard({ clip, projectId, onDelete, onRegenerate }: ClipCardProps) {
  const navigate = useNavigate();
  const duration = clip.end_time - clip.start_time;

  return (
    <div className="panel group overflow-hidden">
      <button
        onClick={() => navigate(`/projects/${projectId}/clips/${clip.id}`)}
        className="relative block aspect-[9/16] w-full overflow-hidden bg-base-800"
      >
        {clip.status === "ready" && clip.thumbnail_path ? (
          <img src={api.clipThumbnailUrl(clip.id)} alt={clip.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-600">
            {clip.status === "rendering" || clip.status === "pending" ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <span className="text-xs">{clip.progress}%</span>
              </>
            ) : (
              <span className="text-3xl opacity-40">🎬</span>
            )}
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {clip.viral_score !== null && (
            <span className="rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
              {clip.viral_score}% est.
            </span>
          )}
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
          {formatDuration(duration)}
        </span>
      </button>

      <div className="p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-medium text-slate-100">{clip.name}</h4>
          <StatusBadge status={clip.status} />
        </div>
        {clip.status === "error" && clip.error_message && (
          <p className="mb-2 line-clamp-2 text-[11px] text-red-400">{clip.error_message}</p>
        )}
        <div className="flex gap-1.5">
          <button
            onClick={() => navigate(`/projects/${projectId}/clips/${clip.id}`)}
            className="flex-1 rounded-md border border-white/10 py-1.5 text-xs text-slate-300 hover:bg-white/5"
          >
            Edit
          </button>
          {clip.status === "ready" && (
            <a
              href={api.clipDownloadUrl(clip.id)}
              className="flex-1 rounded-md border border-white/10 py-1.5 text-center text-xs text-slate-300 hover:bg-white/5"
            >
              Download
            </a>
          )}
          {clip.status !== "rendering" && (
            <button
              onClick={() => onRegenerate(clip)}
              title="Regenerate"
              className="rounded-md border border-white/10 px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5"
            >
              ↻
            </button>
          )}
          <button
            onClick={() => onDelete(clip)}
            title="Delete"
            className="rounded-md border border-white/10 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
