# ViralCut AI

Turn one long-form video into multiple short vertical clips for TikTok, Instagram Reels
and YouTube Shorts — automatically transcribed, scored for "estimated engagement",
reframed to 9:16, subtitled, and ready to export.

**Your videos are processed locally and are not uploaded to an external server.**
Transcription runs on-device with Whisper (via `faster-whisper`), cutting/cropping/
subtitle burn-in runs on-device with FFmpeg, and everything is stored in this project
folder on your Mac. No paid cloud service is required.

---

## Folder structure

```
viralcut-ai/
├── frontend/           React + TypeScript + Vite + Tailwind UI
├── backend/             FastAPI + FFmpeg + Whisper + OpenCV + SQLite
├── uploads/              Original uploaded videos (per project)
├── projects/             SQLite database + transcripts/face-track cache + rendered clip files
├── exports/               Generated ZIP exports
├── temp/                    Scratch space (extracted audio, etc.) - safe to clear
├── models/                Downloaded local Whisper model weights
├── requirements.txt   Pointer to backend/requirements.txt
├── start.sh                Launches backend + frontend together
└── README.md
```

---

## 1. Install Homebrew (macOS package manager)

If you don't already have Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions to add Homebrew to your shell `PATH`, then verify:

```bash
brew --version
```

## 2. Install FFmpeg

ViralCut AI shells out to FFmpeg/FFprobe for every cut, crop, subtitle burn-in and export.

```bash
brew install ffmpeg
ffmpeg -version
```

## 3. Install Python 3.10+ and create a virtual environment

```bash
brew install python@3.11
cd viralcut-ai/backend
python3 -m venv venv
source venv/bin/activate
```

## 4. Install Python dependencies

```bash
# still inside backend/ with venv activated
pip install --upgrade pip
pip install -r requirements.txt
```

This installs FastAPI, Uvicorn, SQLAlchemy, `faster-whisper`, and `opencv-python-headless`.

> Apple Silicon (M1/M2/M3) note: everything here runs on CPU by default (`WHISPER_DEVICE =
> "cpu"` in `backend/app/config.py`), which is what makes this work out of the box on a
> MacBook with no GPU setup required.

## 5. Download the Whisper model

You do not need to download anything manually — the first time you process a video,
`faster-whisper` will automatically download the `base` model (~150 MB) into the
`models/` folder and cache it there for every future run. If you'd rather pre-download it:

```bash
# still inside backend/ with venv activated
python3 - <<'EOF'
from faster_whisper import WhisperModel
WhisperModel("base", device="cpu", compute_type="int8", download_root="../models")
print("Whisper model downloaded.")
EOF
```

To use a more accurate (but slower) model, edit `WHISPER_MODEL_SIZE` in
`backend/app/config.py` (options: `tiny`, `base`, `small`, `medium`, `large-v3`).

## 6. Install Node.js dependencies

```bash
brew install node
cd ../frontend
npm install
```

## 7. Start the backend

```bash
# inside backend/, with venv activated
uvicorn app.main:app --reload --port 8000
```

The backend will be available at **http://localhost:8000** (interactive API docs at
`http://localhost:8000/docs`).

## 8. Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

## 9. Open the app

Visit **http://localhost:5173** in your browser.

### Or start everything with one command

From the `viralcut-ai/` root, once the venv and `node_modules` exist (steps 3–6 above),
you can start both servers together:

```bash
./start.sh
```

This creates the virtual environment and installs dependencies automatically on first
run, starts both servers, and shuts both down cleanly on `Ctrl+C`.

---

## Core workflow

1. **New Project** — drag and drop (or browse for) an MP4/MOV/MKV/WebM file. The
   filename, duration, resolution, size and upload progress are shown live, and the
   original video plays back in the browser.
2. **Choose a generation mode** — Viral Moments (automatic scoring), Random Clips, or
   Manual Selection (pick start/end points on a timeline).
3. **Clip settings** — number of clips, duration, output aspect ratio, resolution, frame
   rate, framing (auto-track / center crop / blurred background / split-screen /
   original), subtitle style, filler-word removal, overlapping clips.
4. **Processing** — a live progress screen walks through all 9 pipeline stages (reading
   video → extracting audio → transcribing → analysing moments → selecting clips →
   detecting speakers → creating subtitles → rendering previews → exporting).
5. **Clip Results** — a grid of generated clips with thumbnails, estimated engagement
   scores, and quick actions (edit, download, regenerate, delete).
6. **Clip Editor** — full editor: trim start/end, change crop/framing, subtitle style and
   styling (font, colors, position, capitalization, max words per line), title overlay
   (with 3 grounded suggestions per clip), progress bar, watermark upload, mute/volume,
   rename, delete, regenerate — plus a clickable transcript panel that seeks the video.
7. **Export** — download a single clip, download all clips as a ZIP, or export subtitles
   as `.srt`/`.vtt`.

---

## What's currently functional (Phase 1–4 implemented)

- Drag-and-drop upload with live progress, metadata (duration/resolution/size), and
  in-browser playback of the original video.
- Manual start/end clip selection on a timeline.
- FFmpeg-based cutting, cropping (auto-track / center / blurred background /
  split-screen / original fit), scaling to 9:16, 1:1 or 16:9 at 1080×1920 or 720×1280,
  and 24/30/60 FPS export — all via safe, argument-list `subprocess` calls (no shell
  string interpolation, so user input can never inject shell or filter commands).
- Local Whisper transcription (`faster-whisper`) with word-level timestamps, cached to
  disk so a video is never re-transcribed.
- Heuristic "estimated engagement" scoring (explicitly labeled as an estimate, not a
  guarantee) for Viral Moments mode, based on hook strength, questions, emotional
  language, numbers/specifics, educational value, story structure, controversial
  language, speech energy, silence ratio, clear endings and self-containment.
- Random Clips mode that avoids silence, near-duplicate ranges, and mid-word cuts.
- Animated, styleable subtitles (6 presets: Clean Minimal, Bold Viral, MrBeast-style,
  Modern White & Yellow, Karaoke Word Highlight, Simple Documentary) with per-word
  highlighting, burned into the video via generated `.ass` files, plus exportable
  `.srt`/`.vtt`.
- Filler-word removal that backs off automatically if it would strip too much of a short
  sentence.
- OpenCV Haar-cascade face detection with smoothing for auto-track framing and
  approximate two-speaker split-screen, with automatic fallback to center crop when no
  face is found.
- Grounded, non-fabricated title/hook suggestions generated per clip from the actual
  transcript text.
- Full clip editor: crop, subtitle style/settings, title overlay, progress bar,
  watermark image upload, mute/volume, rename, delete, regenerate, transcript-driven
  seeking.
- Project dashboard with thumbnails, clip counts, status, and delete (with confirmation).
- Background processing (the UI never freezes) with live stage/percentage polling and
  human-readable error messages for missing FFmpeg, missing Whisper, unsupported
  formats, corrupted video, no speech detected, and render failures.
- Single-clip and ZIP batch export.
- SQLite-backed project/clip persistence — closing the app and reopening it later shows
  the same projects and clips.

## Known simplifications / good next steps

- Face tracking uses OpenCV's classic Haar-cascade detector (fast, no extra downloads)
  rather than a deep-learning face tracker — it works well for a single well-lit face
  but is less robust in low light or with fast motion.
- Split-screen framing uses averaged left/right speaker positions rather than true
  per-speaker diarization.
- The "estimated engagement" score is a transparent, explainable heuristic (see
  `backend/app/services/scoring_service.py`) — it is intentionally not a black-box ML
  model, and is always labeled as an estimate in the UI.
- Rendering is single-clip-at-a-time (controlled concurrency) to stay friendly to a
  MacBook's CPU; this is correct but not the fastest possible throughput on machines
  with many free cores.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "FFmpeg was not found" | `brew install ffmpeg`, then restart the backend. |
| "faster-whisper is not installed" | Re-run `pip install -r requirements.txt` inside the activated `backend/venv`. |
| Upload fails / "Unsupported video format" | Only `.mp4`, `.mov`, `.mkv`, `.webm` are accepted. |
| "No speech was detected" | The audio track may be empty or silent — try a different file or check the volume in the source video. |
| Frontend shows "Cannot reach the backend" | Make sure `uvicorn app.main:app --port 8000` is running in a separate terminal. |
| Port already in use | Stop whatever else is using `5173`/`8000`, or edit `frontend/vite.config.ts` / your `uvicorn --port` flag. |

Everything the app does — uploads, transcripts, rendered clips, the SQLite database — is
stored under `viralcut-ai/uploads`, `projects`, `exports` and `temp`. Deleting a project
in the UI removes all of its files from disk.
