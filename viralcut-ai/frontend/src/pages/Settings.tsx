import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { HealthStatus } from "../types";

export default function Settings() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      const h = await api.health();
      setHealth(h);
    } catch (err: any) {
      setError(err.message || "Could not reach the backend at http://localhost:8000.");
      setHealth(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  const Row = ({ ok, label, detail }: { ok: boolean; label: string; detail?: string | null }) => (
    <div className="flex items-start justify-between border-b border-white/5 py-3 last:border-0">
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        {detail && <div className="mt-0.5 max-w-md text-xs text-slate-500">{detail}</div>}
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
          ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
        }`}
      >
        {ok ? "OK" : "Not available"}
      </span>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Local system status and privacy information.</p>

      <div className="panel mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Backend connection</h3>
          <button
            onClick={check}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
          >
            {checking ? "Checking…" : "Re-check"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
            <div className="mt-2 text-xs text-red-300/80">
              Make sure the backend is running: <code>cd backend &amp;&amp; source venv/bin/activate &amp;&amp; uvicorn app.main:app --reload</code>
            </div>
          </div>
        )}

        {health && (
          <div>
            <Row ok={true} label="Backend server" detail="http://localhost:8000" />
            <Row
              ok={health.ffmpeg_installed}
              label="FFmpeg"
              detail={health.ffmpeg_installed ? "Installed and ready." : "Install with: brew install ffmpeg"}
            />
            <Row
              ok={health.whisper_available}
              label="Whisper (speech transcription)"
              detail={health.whisper_error || "faster-whisper is installed."}
            />
          </div>
        )}
      </div>

      <div className="panel mt-6 p-5">
        <h3 className="mb-2 text-sm font-semibold text-white">Privacy</h3>
        <p className="text-sm text-slate-400">
          Your videos are processed locally and are not uploaded to an external server. Transcripts, clips and
          project data are stored on this machine only, inside the <code>viralcut-ai</code> project folder.
        </p>
      </div>

      <div className="panel mt-6 p-5">
        <h3 className="mb-2 text-sm font-semibold text-white">About</h3>
        <p className="text-sm text-slate-400">ViralCut AI — local long-form to short-form video clipper.</p>
        <p className="mt-1 text-xs text-slate-600">Frontend: http://localhost:5173 · Backend: http://localhost:8000</p>
      </div>
    </div>
  );
}
