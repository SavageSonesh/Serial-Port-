#!/usr/bin/env bash
# Starts the ViralCut AI backend (FastAPI on :8000) and frontend (Vite on :5173).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "ViralCut AI - starting local servers"
echo "Your videos are processed locally and are not uploaded to an external server."
echo

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "WARNING: ffmpeg was not found on your PATH. Install it with: brew install ffmpeg"
fi

if [ ! -d "$BACKEND_DIR/venv" ]; then
  echo "Creating Python virtual environment in backend/venv ..."
  python3 -m venv "$BACKEND_DIR/venv"
  "$BACKEND_DIR/venv/bin/pip" install --upgrade pip >/dev/null
  "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies ..."
  (cd "$FRONTEND_DIR" && npm install)
fi

cleanup() {
  echo
  echo "Stopping ViralCut AI ..."
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:8000 ..."
(cd "$BACKEND_DIR" && "venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173 ..."
(cd "$FRONTEND_DIR" && npm run dev -- --host localhost --port 5173) &
FRONTEND_PID=$!

echo
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

wait
