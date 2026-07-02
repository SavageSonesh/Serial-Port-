import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiError } from "../api/client";
import { ProgressBar } from "../components/common/ProgressBar";
import { usePolling } from "../hooks/usePolling";
import { STAGE_LABELS } from "../lib/utils";
import type { Project, ProjectStatusPayload } from "../types";

const STAGE_ORDER = [
  "reading_video",
  "extracting_audio",
  "transcribing_speech",
  "analyzing_moments",
  "selecting_clips",
  "detecting_speakers",
  "creating_subtitles",
  "rendering_previews",
  "exporting_final_clips",
];

export default function Processing() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<ProjectStatusPayload | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) api.getProject(projectId).then(setProject).catch(() => {});
  }, [projectId]);

  const active = status?.status === "processing" || status === null;

  usePolling(
    async () => {
      if (!projectId) return;
      try {
        const s = await api.getStatus(projectId);
        setStatus(s);
        setConnectionError(null);
        if (s.status === "ready") {
          navigate(`/projects/${projectId}/clips`);
        }
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 0) {
          setConnectionError(err.message);
        }
      }
    },
    1500,
    active
  );

  const currentIndex = status ? STAGE_ORDER.indexOf(status.stage) : -1;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-semibold text-white">Processing {project?.name}</h1>
      <p className="mt-1 text-sm text-slate-500">This runs entirely on your machine — no video is uploaded anywhere.</p>

      {connectionError && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {connectionError}
        </div>
      )}

      {status?.status === "error" ? (
        <div className="mt-8 panel border-red-500/30 p-6">
          <h3 className="text-base font-semibold text-red-300">Processing failed</h3>
          <p className="mt-2 text-sm text-slate-300">{status.error_message}</p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => navigate(`/new?project=${projectId}`)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-soft"
            >
              Adjust settings &amp; retry
            </button>
            <button
              onClick={() => navigate("/")}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <div className="panel p-6">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
              <span>{STAGE_LABELS[status?.stage || ""] || "Starting…"}</span>
              <span>{status?.progress ?? 0}%</span>
            </div>
            <ProgressBar value={status?.progress ?? 0} />
          </div>

          <ol className="mt-6 space-y-1">
            {STAGE_ORDER.map((stage, i) => {
              const done = currentIndex > i || status?.stage === "done";
              const isCurrent = currentIndex === i;
              return (
                <li
                  key={stage}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    isCurrent ? "bg-accent/10 text-white" : done ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      done ? "bg-emerald-500/20 text-emerald-300" : isCurrent ? "bg-accent text-white" : "bg-base-800 text-slate-600"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {STAGE_LABELS[stage]}
                  {isCurrent && (
                    <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-accent-glow" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
