import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import { ClipCard } from "../components/clips/ClipCard";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ClipCardSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { useToast } from "../components/common/ToastProvider";
import { usePolling } from "../hooks/usePolling";
import type { Clip, Project } from "../types";

export default function ClipResults() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Clip | null>(null);

  const load = async () => {
    if (!projectId) return;
    const [p, c] = await Promise.all([api.getProject(projectId), api.listClips(projectId)]);
    setProject(p);
    setClips(c);
  };

  useEffect(() => {
    load().catch((err) => toast.error(err.message || "Failed to load project."));
  }, [projectId]);

  const hasActiveRenders = !!clips?.some((c) => c.status === "rendering" || c.status === "pending");
  usePolling(
    async () => {
      if (!projectId) return;
      const c = await api.listClips(projectId);
      setClips(c);
    },
    2000,
    hasActiveRenders
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.deleteClip(pendingDelete.id);
      toast.success("Clip deleted.");
      setPendingDelete(null);
      setClips((prev) => prev?.filter((c) => c.id !== pendingDelete.id) ?? null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete clip.");
    }
  };

  const handleRegenerate = async (clip: Clip) => {
    try {
      const updated = await api.regenerateClip(clip.id);
      toast.info(`Regenerating "${clip.name}"…`);
      setClips((prev) => prev?.map((c) => (c.id === clip.id ? updated : c)) ?? null);
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate clip.");
    }
  };

  const readyCount = clips?.filter((c) => c.status === "ready").length ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{project?.name || "Clips"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {clips ? `${clips.length} clip${clips.length === 1 ? "" : "s"} generated` : "Loading…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
          >
            Dashboard
          </button>
          {readyCount > 0 && (
            <a
              href={api.projectExportZipUrl(projectId!)}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-soft"
            >
              Export All (ZIP)
            </a>
          )}
        </div>
      </div>

      {project && (
        <div className="panel mb-6 overflow-hidden">
          <video src={api.projectVideoUrl(project.id)} controls className="max-h-64 w-full bg-black" />
        </div>
      )}

      {clips === null && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ClipCardSkeleton key={i} />
          ))}
        </div>
      )}

      {clips !== null && clips.length === 0 && (
        <EmptyState title="No clips yet" description="Generate clips from the New Project page to see them here." />
      )}

      {clips !== null && clips.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {clips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              projectId={projectId!}
              onDelete={setPendingDelete}
              onRegenerate={handleRegenerate}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete clip?"
        message={`This will permanently delete "${pendingDelete?.name}".`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
