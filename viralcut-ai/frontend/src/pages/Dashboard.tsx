import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import { ProjectCardSkeleton } from "../components/common/Skeleton";
import { useToast } from "../components/common/ToastProvider";
import { StatusBadge } from "../components/clips/StatusBadge";
import { formatDate, formatDuration } from "../lib/utils";
import type { Project } from "../types";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = async () => {
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load projects.");
      setProjects([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openProject = (p: Project) => {
    if (p.status === "processing") navigate(`/projects/${p.id}/processing`);
    else if (p.status === "ready") navigate(`/projects/${p.id}/clips`);
    else navigate(`/new?project=${p.id}`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.deleteProject(pendingDelete.id);
      toast.success(`"${pendingDelete.name}" was deleted.`);
      setPendingDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Recent projects processed locally on this machine.</p>
        </div>
        <button
          onClick={() => navigate("/new")}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-soft"
        >
          + New Project
        </button>
      </div>

      {projects === null && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {projects !== null && projects.length === 0 && (
        <EmptyState
          icon="🎬"
          title="No projects yet"
          description="Upload a long-form video to automatically generate viral vertical clips with subtitles."
          action={
            <button
              onClick={() => navigate("/new")}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-soft"
            >
              Create your first project
            </button>
          }
        />
      )}

      {projects !== null && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="panel group overflow-hidden transition hover:border-white/10">
              <button onClick={() => openProject(p)} className="block w-full text-left">
                <div className="relative aspect-video w-full overflow-hidden bg-base-800">
                  {p.thumbnail_path ? (
                    <img
                      src={api.projectThumbnailUrl(p.id)}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">🎞️</div>
                  )}
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
                    {formatDuration(p.duration)}
                  </span>
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-medium text-slate-100">{p.name}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{p.clip_count} clip{p.clip_count === 1 ? "" : "s"}</span>
                    <span>{formatDate(p.created_at)}</span>
                  </div>
                </div>
              </button>
              <div className="flex border-t border-white/5">
                <button
                  onClick={() => openProject(p)}
                  className="flex-1 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
                >
                  Open
                </button>
                <button
                  onClick={() => setPendingDelete(p)}
                  className="flex-1 border-l border-white/5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete project?"
        message={`This will permanently delete "${pendingDelete?.name}" and all of its generated clips. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
