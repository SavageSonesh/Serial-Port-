import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { importUrl, upsertTrendItem, fetchMetadataForUrl } from '../services/trendService.js';
import { parseCsvObjects } from '../lib/csv.js';
import { detectPlatform } from '../lib/platform.js';

export const importRouter = Router();

/** Preview: detect platform + fetch allowed metadata without saving. */
importRouter.post('/preview', async (req, res) => {
  const body = z.object({ url: z.string().min(3) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Provide a URL' });
  const { detected, metadata } = await fetchMetadataForUrl(body.data.url);
  if (!detected) {
    return res.status(422).json({
      error: 'Unrecognised URL. Supported: TikTok, Instagram, YouTube / YouTube Shorts.',
    });
  }
  const dup = await prisma.trendItem.findUnique({ where: { urlKey: detected.urlKey } });
  res.json({
    detected: { platformId: detected.platformId, format: detected.format, cleanUrl: detected.cleanUrl, handle: detected.handle },
    metadata,
    duplicate: dup ? { id: dup.id, title: dup.title } : null,
  });
});

const extraFields = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  views: z.number().nonnegative().nullable().optional(),
  likes: z.number().nonnegative().nullable().optional(),
  comments: z.number().nonnegative().nullable().optional(),
  shares: z.number().nonnegative().nullable().optional(),
  followerCount: z.number().nonnegative().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  nicheName: z.string().nullable().optional(),
  audioName: z.string().nullable().optional(),
  hashtags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  creatorHandle: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
});

/** Import a single URL (with optional manual metric overrides). */
importRouter.post('/url', async (req, res) => {
  const body = z.object({ url: z.string().min(3), extra: extraFields.optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });
  const cleaned = Object.fromEntries(
    Object.entries(body.data.extra ?? {}).filter(([, v]) => v !== undefined)
  );
  const result = await importUrl(body.data.url, cleaned);
  if (result.status === 'error') return res.status(422).json({ error: result.message });
  res.json(result);
});

/** Import multiple URLs pasted as newline/whitespace-separated text. */
importRouter.post('/urls', async (req, res) => {
  const body = z.object({ text: z.string().min(3) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Paste at least one URL' });
  const urls = [...new Set(body.data.text.split(/\s+/).map((u) => u.trim()).filter((u) => u.length > 3))];
  if (urls.length === 0) return res.status(400).json({ error: 'No URLs found in the pasted text' });
  if (urls.length > 100) return res.status(400).json({ error: 'Maximum 100 URLs per batch' });

  const job = await prisma.importJob.create({ data: { type: 'urls', status: 'pending', totalItems: urls.length } });
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  const results: { url: string; status: string; message?: string }[] = [];

  for (const url of urls) {
    const r = await importUrl(url);
    results.push({ url, status: r.status, message: r.metadataMessage ?? r.message });
    if (r.status === 'created' || r.status === 'updated') imported++;
    else {
      skipped++;
      if (r.message) errors.push(`${url}: ${r.message}`);
    }
    // Be polite to platform endpoints when batching.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: errors.length === 0 ? 'completed' : imported > 0 ? 'partial' : 'failed',
      importedItems: imported,
      skippedItems: skipped,
      errorsJson: errors.length > 0 ? JSON.stringify(errors) : null,
    },
  });
  res.json({ jobId: job.id, imported, skipped, results });
});

// Header aliases: parseCsvObjects lowercases and strips separators.
const CSV_ALIASES: Record<string, string> = {
  url: 'url', link: 'url', videourl: 'url', posturl: 'url',
  title: 'title', caption: 'title', name: 'title',
  description: 'description', desc: 'description',
  platform: 'platform', site: 'platform',
  creator: 'creatorHandle', creatorhandle: 'creatorHandle', author: 'creatorHandle', channel: 'creatorHandle', username: 'creatorHandle',
  views: 'views', viewcount: 'views', plays: 'views',
  likes: 'likes', likecount: 'likes', hearts: 'likes',
  comments: 'comments', commentcount: 'comments',
  shares: 'shares', sharecount: 'shares', reposts: 'shares',
  followers: 'followerCount', followercount: 'followerCount',
  published: 'publishedAt', publishedat: 'publishedAt', date: 'publishedAt', postdate: 'publishedAt', posteddate: 'publishedAt', postingtime: 'publishedAt',
  country: 'country', region: 'country',
  language: 'language', lang: 'language',
  niche: 'nicheName', category: 'nicheName', topic: 'nicheName',
  audio: 'audioName', song: 'audioName', sound: 'audioName', music: 'audioName',
  hashtags: 'hashtags', tags: 'hashtags',
  notes: 'notes', note: 'notes',
  format: 'format',
};

function num(v?: string): number | null {
  if (!v) return null;
  // Accept "1,234,567", "1.2M", "45K", "3.4B"
  const cleaned = v.replace(/[\s,]/g, '').toLowerCase();
  const m = cleaned.match(/^([\d.]+)([kmb])?$/);
  if (!m) return null;
  const base = parseFloat(m[1]);
  if (isNaN(base)) return null;
  const mult = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : m[2] === 'b' ? 1e9 : 1;
  return Math.round(base * mult);
}

export function csvRowToInput(row: Record<string, string>): Record<string, unknown> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const target = CSV_ALIASES[key];
    if (target && value !== '') mapped[target] = value;
  }
  const platformRaw = mapped.platform?.toLowerCase().replace(/[\s_-]/g, '');
  const platformId =
    platformRaw === 'tiktok' ? 'tiktok'
    : platformRaw === 'instagram' || platformRaw === 'ig' || platformRaw === 'reels' ? 'instagram'
    : platformRaw?.startsWith('youtube') || platformRaw === 'yt' || platformRaw === 'shorts' ? 'youtube'
    : mapped.url ? detectPlatform(mapped.url)?.platformId
    : undefined;

  return {
    url: mapped.url || null,
    title: mapped.title,
    description: mapped.description ?? null,
    platformId,
    creatorHandle: mapped.creatorHandle ?? null,
    views: num(mapped.views),
    likes: num(mapped.likes),
    comments: num(mapped.comments),
    shares: num(mapped.shares),
    followerCount: num(mapped.followerCount),
    publishedAt: mapped.publishedAt || null,
    country: mapped.country ?? null,
    language: mapped.language ?? null,
    nicheName: mapped.nicheName ?? null,
    audioName: mapped.audioName ?? null,
    hashtags: mapped.hashtags ? mapped.hashtags.split(/[\s,;]+/).map((h) => h.replace(/^#/, '')).filter(Boolean) : [],
    notes: mapped.notes ?? null,
    format: mapped.format ?? null,
  };
}

/** CSV import — flexible headers, never rejects rows for missing metrics. */
importRouter.post('/csv', async (req, res) => {
  const body = z.object({ csv: z.string().min(3) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Provide CSV text' });
  const rows = parseCsvObjects(body.data.csv);
  if (rows.length === 0) return res.status(400).json({ error: 'CSV appears to be empty or missing a header row' });
  if (rows.length > 1000) return res.status(400).json({ error: 'Maximum 1000 rows per import' });

  const job = await prisma.importJob.create({ data: { type: 'csv', status: 'pending', totalItems: rows.length } });
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const input = csvRowToInput(rows[i]);
    if (!input.title && !input.url) {
      skipped++;
      errors.push(`Row ${i + 2}: needs at least a title or a URL`);
      continue;
    }
    if (!input.platformId) {
      skipped++;
      errors.push(`Row ${i + 2}: could not determine platform (add a "platform" column or a recognisable URL)`);
      continue;
    }
    const r = await upsertTrendItem(input as Parameters<typeof upsertTrendItem>[0], { updateDuplicates: true });
    if (r.status === 'created' || r.status === 'updated') imported++;
    else {
      skipped++;
      if (r.message) errors.push(`Row ${i + 2}: ${r.message}`);
    }
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: errors.length === 0 ? 'completed' : imported > 0 ? 'partial' : 'failed',
      importedItems: imported,
      skippedItems: skipped,
      errorsJson: errors.length > 0 ? JSON.stringify(errors.slice(0, 50)) : null,
    },
  });
  res.json({ jobId: job.id, imported, skipped, errors: errors.slice(0, 50) });
});

/** JSON import — array of trend item objects (same shape as JSON export). */
importRouter.post('/json', async (req, res) => {
  const body = z.object({ items: z.array(z.record(z.unknown())).min(1).max(1000) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Provide { items: [...] } with 1–1000 objects' });

  const job = await prisma.importJob.create({ data: { type: 'json', status: 'pending', totalItems: body.data.items.length } });
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < body.data.items.length; i++) {
    const raw = body.data.items[i] as Record<string, unknown>;
    const input = {
      url: typeof raw.url === 'string' ? raw.url : null,
      title: typeof raw.title === 'string' ? raw.title : undefined,
      description: typeof raw.description === 'string' ? raw.description : null,
      platformId: typeof raw.platformId === 'string' ? raw.platformId : typeof raw.platform === 'string' ? raw.platform : undefined,
      creatorHandle: typeof raw.creatorHandle === 'string' ? raw.creatorHandle : typeof raw.creator === 'string' ? raw.creator : null,
      views: numOrNull(raw.views),
      likes: numOrNull(raw.likes),
      comments: numOrNull(raw.comments),
      shares: numOrNull(raw.shares),
      followerCount: numOrNull(raw.followerCount),
      publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt : null,
      country: typeof raw.country === 'string' ? raw.country : null,
      language: typeof raw.language === 'string' ? raw.language : null,
      nicheName: typeof raw.niche === 'string' ? raw.niche : typeof raw.nicheName === 'string' ? raw.nicheName : null,
      audioName: typeof raw.audioName === 'string' ? raw.audioName : typeof raw.audio === 'string' ? raw.audio : null,
      hashtags: Array.isArray(raw.hashtags) ? raw.hashtags.filter((h): h is string => typeof h === 'string') : [],
      notes: typeof raw.notes === 'string' ? raw.notes : null,
      format: typeof raw.format === 'string' ? raw.format : null,
    };
    if (!input.title && !input.url) {
      skipped++;
      errors.push(`Item ${i + 1}: needs at least a title or a URL`);
      continue;
    }
    const r = await upsertTrendItem(input, { updateDuplicates: true });
    if (r.status === 'created' || r.status === 'updated') imported++;
    else {
      skipped++;
      if (r.message) errors.push(`Item ${i + 1}: ${r.message}`);
    }
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: errors.length === 0 ? 'completed' : imported > 0 ? 'partial' : 'failed',
      importedItems: imported,
      skippedItems: skipped,
      errorsJson: errors.length > 0 ? JSON.stringify(errors.slice(0, 50)) : null,
    },
  });
  res.json({ jobId: job.id, imported, skipped, errors: errors.slice(0, 50) });
});

importRouter.get('/jobs', async (_req, res) => {
  const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  res.json(jobs.map((j) => ({ ...j, errors: j.errorsJson ? JSON.parse(j.errorsJson) : [] })));
});

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v) && v >= 0) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (isFinite(n) && n >= 0) return n;
  }
  return null;
}
