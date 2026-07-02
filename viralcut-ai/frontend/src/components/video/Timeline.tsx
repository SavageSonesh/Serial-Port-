import { formatDuration } from "../../lib/utils";

interface TimelineProps {
  duration: number;
  currentTime: number;
  ranges?: { start: number; end: number; color?: string }[];
  onSeek: (time: number) => void;
  markerStart?: number;
  markerEnd?: number;
}

export function Timeline({ duration, currentTime, ranges = [], onSeek, markerStart, markerEnd }: TimelineProps) {
  const safeDuration = duration > 0 ? duration : 1;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(frac * safeDuration);
  };

  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / safeDuration) * 100))}%`;

  return (
    <div className="w-full select-none">
      <div
        onClick={handleClick}
        className="relative h-8 w-full cursor-pointer rounded-md bg-base-800"
      >
        {ranges.map((r, i) => (
          <div
            key={i}
            className="absolute top-0 h-full rounded-sm opacity-70"
            style={{ left: pct(r.start), width: pct(r.end - r.start), backgroundColor: r.color || "#7c5cff" }}
          />
        ))}
        {markerStart !== undefined && markerEnd !== undefined && (
          <div
            className="absolute top-0 h-full rounded-sm border-2 border-accent-glow bg-accent/30"
            style={{ left: pct(markerStart), width: pct(Math.max(0, markerEnd - markerStart)) }}
          />
        )}
        <div
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-white"
          style={{ left: pct(currentTime) }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>0:00</span>
        <span>{formatDuration(currentTime)} / {formatDuration(duration)}</span>
      </div>
    </div>
  );
}
