import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { getSettings, setSetting, DEFAULT_SETTINGS } from '../lib/settings.js';
import { seedDemoData } from '../services/demoData.js';
import { logger } from '../logger.js';

export const settingsRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', '..', 'prisma', 'dev.db');
const BACKUP_DIR = path.resolve(__dirname, '..', '..', 'data', 'backups');

settingsRouter.get('/', async (_req, res) => {
  const settings = await getSettings();
  res.json({
    settings,
    defaults: DEFAULT_SETTINGS,
    // Presence flags only — secrets never leave the backend.
    youtubeApiKeyConfigured: Boolean(env.youtubeApiKey),
    countries: ['Worldwide', 'Portugal', 'India', 'Nepal', 'United Kingdom', 'United States'],
  });
});

settingsRouter.put('/', async (req, res) => {
  const body = z.record(z.string()).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Settings must be a map of string values' });
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  for (const [key, value] of Object.entries(body.data)) {
    if (!allowed.has(key)) return res.status(400).json({ error: `Unknown setting "${key}"` });
    await setSetting(key, value);
  }
  res.json({ settings: await getSettings() });
});

/** Create a timestamped copy of the SQLite file. */
settingsRouter.post('/backup', async (_req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(BACKUP_DIR, `trendradar-backup-${stamp}.db`);
    fs.copyFileSync(DB_PATH, dest);
    res.json({ ok: true, file: dest, size: fs.statSync(dest).size });
  } catch (err) {
    logger.error('Backup failed', { error: String(err) });
    res.status(500).json({ error: `Backup failed: ${String(err)}` });
  }
});

settingsRouter.get('/backups', async (_req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const st = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: st.size, createdAt: st.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ backups: files, dir: BACKUP_DIR });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** Restore a named backup file from the local backups folder. */
settingsRouter.post('/restore', async (req, res) => {
  const body = z.object({ name: z.string().regex(/^[\w.-]+\.db$/, 'Invalid backup file name') }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });
  const src = path.join(BACKUP_DIR, body.data.name);
  if (!fs.existsSync(src) || path.dirname(src) !== BACKUP_DIR) {
    return res.status(404).json({ error: 'Backup file not found' });
  }
  try {
    await prisma.$disconnect();
    fs.copyFileSync(src, DB_PATH);
    // Remove stale SQLite sidecar files so the restored file is authoritative.
    for (const suffix of ['-journal', '-wal', '-shm']) {
      const sidecar = DB_PATH + suffix;
      if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
    }
    res.json({ ok: true, message: 'Database restored. Restart the server (`npm run dev`) to reload it cleanly.' });
    logger.info('Database restored from backup; exiting so the process manager restarts with the new file');
    setTimeout(() => process.exit(0), 300);
  } catch (err) {
    logger.error('Restore failed', { error: String(err) });
    res.status(500).json({ error: `Restore failed: ${String(err)}` });
  }
});

/** Danger zone: wipe all user data (frontend shows a confirmation dialog first). */
settingsRouter.post('/clear-all', async (req, res) => {
  const body = z.object({ confirm: z.literal('DELETE') }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Send { "confirm": "DELETE" } to clear all data' });
  await prisma.$transaction([
    prisma.metricSnapshot.deleteMany(),
    prisma.trendItemHashtag.deleteMany(),
    prisma.ideaTagOnIdea.deleteMany(),
    prisma.savedIdea.deleteMany(),
    prisma.trendItem.deleteMany(),
    prisma.creator.deleteMany(),
    prisma.hashtag.deleteMany(),
    prisma.audio.deleteMany(),
    prisma.searchQuery.deleteMany(),
    prisma.importJob.deleteMany(),
    prisma.ideaTag.deleteMany(),
  ]);
  res.json({ ok: true, message: 'All trend data, ideas and history deleted. Niches and settings kept.' });
});

/** Seed clearly-labelled demo data. */
settingsRouter.post('/demo-data', async (_req, res) => {
  const result = await seedDemoData();
  res.json(result);
});

/** Remove ONLY the sample data. */
settingsRouter.delete('/demo-data', async (_req, res) => {
  const trends = await prisma.trendItem.deleteMany({ where: { isSample: true } });
  const ideas = await prisma.savedIdea.deleteMany({ where: { isSample: true } });
  res.json({ ok: true, removedTrends: trends.count, removedIdeas: ideas.count });
});
