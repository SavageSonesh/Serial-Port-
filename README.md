# TrendRadar Local 📡

A **private, local-only trend-research dashboard** for TikTok, Instagram Reels, YouTube Shorts and Google Trends — inspired by tools like Virlo, but running entirely on your own computer.

- **No paid APIs. No subscriptions. No cloud services. No accounts. No tracking.**
- Everything is stored in a local SQLite file. The server binds to `127.0.0.1` only.

---

## What it does

| Page | What you get |
|---|---|
| **Dashboard** | Totals, new-today, best platform, top niches, cross-platform topics, activity + platform charts, filterable top trends |
| **Trend Explorer** | Grid & table views, 7 sort orders, full-text search, filters, metric editing with growth history |
| **Add Content** | Single URL, bulk URLs, manual entry, CSV import, JSON import — platform auto-detected from the URL |
| **Comparison** | Compare up to 5 trends: metrics, charts per metric, hashtags, audio, written summary |
| **Cross-Platform** | Local keyword/hashtag/audio similarity groups topics across platforms ("Appearing on two platforms", etc.) |
| **Idea Generator** | Template-based generator (11 categories, works offline) + optional local AI via Ollama |
| **Structure Analyzer** | Describe a viral video → hook/setup/payoff/pattern-interrupt/CTA breakdown |
| **Saved Ideas** | Content pipeline: 9 statuses, priority, tags, planned dates, recorded/edited/posted flags, published URL |
| **Sources** | Honest connector status, YouTube search (with key), Google Trends search, keyword watchlist |
| **Settings** | Defaults, refresh schedule, Ollama config, exports, DB backup/restore, clear data, light/dark theme |

### Honest platform limitations (important)

This app **never bypasses logins, CAPTCHAs, rate limits or platform security**:

- **YouTube** — works without any key (title/author/thumbnail via the free public oEmbed endpoint). Add a **free** YouTube Data API v3 key to unlock view/like/comment counts and search.
- **Google Trends** — uses a free unofficial library. Occasional rate limits and breakage are expected; the app shows a clear message and keeps working.
- **TikTok** — TikTok does not provide free public access to metrics. The app fetches title/creator/thumbnail from TikTok's **public oEmbed endpoint** where possible; you enter metrics manually (they're visible on the video page) or import via CSV.
- **Instagram** — Meta requires an approved app token even for oEmbed, so there is **no free automatic path**. URLs are detected and saved; captions/metrics are entered manually or via CSV. The app **never asks for your Instagram password**.

Missing metrics never cause an item to be rejected.

---

## Requirements

- **Node.js 20 or newer** (includes npm)
- macOS, Linux or Windows — instructions below use macOS

### Installing Node.js on a Mac

Option A (recommended, via [Homebrew](https://brew.sh)):

```bash
brew install node
```

Option B: download the macOS installer from <https://nodejs.org> (choose the LTS version) and run it.

Verify:

```bash
node --version   # should print v20.x or newer
```

## Running the application

From the project folder:

```bash
npm install     # 1. install all dependencies (backend + frontend)
npm run setup   # 2. create the SQLite database and seed platforms + default niches
npm run dev     # 3. start backend (127.0.0.1:3001) and frontend together
```

Then open **<http://127.0.0.1:5173>** in your browser.

> First time? Press **"Load sample data"** on the Dashboard to explore the interface. Every sample record is clearly labelled *"Sample data — not live platform data."* and can be removed with one click.

### All commands

| Command | What it does |
|---|---|
| `npm install` | Install everything |
| `npm run setup` | Create/update the database schema and seed defaults |
| `npm run dev` | Start backend + frontend together (development) |
| `npm run build` | Type-check and build both apps for production |
| `npm start` | Run the built backend |
| `npm test` | Run the backend test suite (57 tests) |
| `npm run typecheck` | Type-check backend + frontend |
| `npm run db:reset` | ⚠️ Wipe and recreate the database, then re-seed |
| `npm run backup` | Copy the database to `backend/data/backups/` with a timestamp |
| `npm run restore` | Restore the most recent backup (`npm run restore -- <file>` for a specific one) |

## Adding a YouTube API key (optional, free)

1. Go to <https://console.cloud.google.com>, create a project.
2. **APIs & Services → Library →** enable **YouTube Data API v3**.
3. **Credentials → Create credentials → API key.**
4. Copy `.env.example` to `backend/.env` (if you haven't) and set:
   ```
   YOUTUBE_API_KEY=your-key-here
   ```
5. Restart `npm run dev`.

The key lives only in `backend/.env` (git-ignored) and is never sent to the browser.

## Installing Ollama (optional, free)

The idea generator works fully without AI. For locally-AI-written ideas:

1. Download Ollama from <https://ollama.com> and install it.
2. Pull a model: `ollama pull llama3.2`
3. In the app: **Settings → Local AI → Enabled**, model `llama3.2`, URL `http://localhost:11434`.

If Ollama isn't running, the app automatically falls back to the template generator.

## Backing up your data

Everything lives in one file: `backend/prisma/dev.db`.

- In the app: **Settings → Create backup** (and Restore).
- Terminal: `npm run backup` / `npm run restore`.
- Manual: copy `backend/prisma/dev.db` anywhere you like (quit the app first).

## Stopping the server

Press **Ctrl+C** in the terminal running `npm run dev`. That's it — nothing keeps running in the background, and scheduled refreshes only happen while the server is running.

## Troubleshooting

| Problem | Fix |
|---|---|
| `EADDRINUSE: port 3001/5173 in use` | Another copy is running. `lsof -ti:3001 -ti:5173 \| xargs kill`, then `npm run dev`. |
| Browser shows "Cannot reach the local backend" | Make sure `npm run dev` is running and shows both `backend` and `frontend` output. |
| `prisma` errors after pulling updates | Run `npm run setup` again (applies schema changes, keeps data). |
| Google Trends returns rate-limit messages | Normal for the unofficial endpoint — wait a few minutes. |
| TikTok/Instagram metrics are empty | Expected — those platforms block free automatic collection. Enter metrics manually or via CSV. |
| Want a completely fresh start | `npm run db:reset` (⚠️ deletes all data), or restore a backup. |
| Node version errors | Upgrade Node: `brew upgrade node` (needs ≥ 20). |

## Privacy

- Binds to `127.0.0.1` (loopback) — never `0.0.0.0`, never exposed to your network or the internet.
- No account system, no cloud database, no analytics, no telemetry, no ads.
- All data stays in `backend/prisma/dev.db` on your computer.
- Secrets live only in `backend/.env`, which is listed in `.gitignore`.

## Architecture

```
├── backend/            Express + TypeScript API
│   ├── prisma/         SQLite schema (13 models) + seed
│   ├── src/lib/        scoring, platform detection, CSV, similarity, idea templates
│   ├── src/connectors/ YouTube, Google Trends, TikTok, Instagram, Ollama
│   ├── src/routes/     REST endpoints (trends, import, export, settings, …)
│   ├── src/services/   trend upsert/dedup/snapshots, demo data
│   └── tests/          vitest suite (scoring, dedup, CSV, platform detection, DB ops)
├── frontend/           React + TypeScript + Vite + Tailwind + Recharts + Lucide
│   └── src/pages/      the 10 application pages
└── package.json        npm workspaces + combined scripts
```

### Trend score (transparent, 0–100)

```
trendScore = velocity×0.35 + engagement×0.25 + freshness×0.20 + crossPlatform×0.10 + comments×0.10
```

- **Velocity** — views ÷ max(hours since posting, 1), log-scaled so mega-creators don't distort results
- **Engagement** — ((likes + comments + shares) ÷ views) × 100; marked *estimated* when shares are unavailable
- **Freshness** — exponential decay with age
- **Cross-platform** — boost when the topic appears on 2–3 platforms
- **Comments** — log-scaled comment volume

Labels: 0–24 Low activity · 25–49 Growing · 50–69 Trending · 70–84 Viral · 85–100 Breakout.
Hover any score in the app to see the full per-factor breakdown.
