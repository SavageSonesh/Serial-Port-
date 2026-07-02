import { classNames } from "../../lib/utils";

const STYLES: Record<string, string> = {
  uploaded: "bg-slate-500/15 text-slate-300",
  uploading: "bg-slate-500/15 text-slate-300",
  processing: "bg-accent/15 text-accent-glow",
  ready: "bg-emerald-500/15 text-emerald-300",
  error: "bg-red-500/15 text-red-300",
  pending: "bg-slate-500/15 text-slate-300",
  rendering: "bg-accent/15 text-accent-glow",
};

const LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  uploading: "Uploading",
  processing: "Processing",
  ready: "Ready",
  error: "Error",
  pending: "Pending",
  rendering: "Rendering",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        STYLES[status] || "bg-slate-500/15 text-slate-300"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status] || status}
    </span>
  );
}
