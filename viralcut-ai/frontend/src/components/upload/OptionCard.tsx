import { classNames } from "../../lib/utils";

interface OptionCardProps {
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
}

export function OptionCard({ label, description, active, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex-1 rounded-lg border px-4 py-3 text-left transition",
        active ? "border-accent bg-accent/10" : "border-white/10 bg-base-800 hover:border-white/20"
      )}
    >
      <div className={classNames("text-sm font-medium", active ? "text-white" : "text-slate-200")}>{label}</div>
      {description && <div className="mt-0.5 text-xs text-slate-500">{description}</div>}
    </button>
  );
}
