import { classNames, formatDuration } from "../../lib/utils";
import type { Transcript } from "../../types";

interface TranscriptPanelProps {
  transcript: Transcript | null;
  clipStart: number;
  clipEnd: number;
  activeTime: number;
  onSeek: (sourceTime: number) => void;
}

export function TranscriptPanel({ transcript, clipStart, clipEnd, activeTime, onSeek }: TranscriptPanelProps) {
  if (!transcript) {
    return (
      <div className="panel flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
        No transcript available for this project yet.
      </div>
    );
  }

  const segments = transcript.segments.filter((s) => s.end > clipStart - 5 && s.start < clipEnd + 5);
  const absoluteActive = clipStart + activeTime;

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/5 px-4 py-3 text-sm font-semibold text-white">Transcript</div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {segments.map((seg) => {
          const inClip = seg.end > clipStart && seg.start < clipEnd;
          const isActive = absoluteActive >= seg.start && absoluteActive <= seg.end;
          return (
            <button
              key={seg.id}
              onClick={() => onSeek(seg.start)}
              className={classNames(
                "block w-full rounded-md px-3 py-2 text-left text-sm transition",
                isActive ? "bg-accent/20 text-white" : inClip ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-white/5"
              )}
            >
              <span className="mr-2 font-mono text-[10px] text-slate-500">{formatDuration(seg.start)}</span>
              {seg.text}
            </button>
          );
        })}
        {segments.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-600">No transcript text near this clip.</p>}
      </div>
    </div>
  );
}
