import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { TREND_INCLUDE, serializeTrend, upsertTrendItem, importUrl } from '../services/trendService.js';
import { computeTrendScore } from '../lib/scoring.js';

export const trendsRouter = Router();

const listQuery = z.object({
  platform: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  niche: z.string().optional(),
  format: z.string().optional(),
  search: z.string().optional(),
  minViews: z.coerce.number().optional(),
  minEngagement: z.coerce.number().optional(),
  saved: z.enum(['true', 'false']).optional(),
  monitoring: z.enum(['true', 'false']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z
    .enum(['trendScore', 'views', 'viewsPerHour', 'engagementRate', 'newest', 'mostLiked', 'mostCommented'])
    .default('trendScore'),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

const SORT_MAP: Record<string, object> = {
  trendScore: { trendScore: 'desc' },
  views: { views: 'desc' },
  viewsPerHour: { viewsPerHour: 'desc' },
  engagementRate: { engagementRate: 'desc' },
  newest: { createdAt: 'desc' },
  mostLiked: { likes: 'desc' },
  mostCommented: { comments: 'desc' },
};

trendsRouter.get('/', async (req, res) => {
  const q = listQuery.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.issues[0]?.message ?? 'Invalid query' });
  const f = q.data;

  const where: Record<string, unknown> = {};
  if (f.platform) where.platformId = f.platform;
  if (f.country) where.country = f.country;
  if (f.language) where.language = f.language;
  if (f.format) where.format = f.format;
  if (f.niche) where.niche = { name: f.niche };
  if (f.minViews != null) where.views = { gte: f.minViews };
  if (f.minEngagement != null) where.engagementRate = { gte: f.minEngagement };
  if (f.saved) where.saved = f.saved === 'true';
  if (f.monitoring) where.monitoring = f.monitoring === 'true';
  if (f.dateFrom || f.dateTo) {
    where.publishedAt = {
      ...(f.dateFrom ? { gte: new Date(f.dateFrom) } : {}),
      ...(f.dateTo ? { lte: new Date(f.dateTo) } : {}),
    };
  }
  if (f.search) {
    where.OR = [
      { title: { contains: f.search } },
      { description: { contains: f.search } },
      { notes: { contains: f.search } },
      { creator: { handle: { contains: f.search } } },
      { hashtags: { some: { hashtag: { tag: { contains: f.search.toLowerCase().replace(/^#/, '') } } } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.trendItem.findMany({
      where,
      include: TREND_INCLUDE,
      orderBy: SORT_MAP[f.sort] ?? { trendScore: 'desc' },
      take: f.limit,
      skip: f.offset,
    }),
    prisma.trendItem.count({ where }),
  ]);
  res.json({ items: items.map(serializeTrend), total });
});

trendsRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
  const item = await prisma.trendItem.findUnique({
    where: { id },
    include: { ...TREND_INCLUDE, snapshots: { orderBy: { capturedAt: 'asc' } } },
  });
  if (!item) return res.status(404).json({ error: 'Trend item not found' });
  res.json(serializeTrend(item));
});

const metricsSchema = z.object({
  views: z.number().nonnegative().nullable().optional(),
  likes: z.number().nonnegative().nullable().optional(),
  comments: z.number().nonnegative().nullable().optional(),
  shares: z.number().nonnegative().nullable().optional(),
});

const updateSchema = metricsSchema.extend({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  nicheName: z.string().nullable().optional(),
  audioName: z.string().nullable().optional(),
  hashtags: z.array(z.string()).optional(),
  saved: z.boolean().optional(),
  monitoring: z.boolean().optional(),
  publishedAt: z.string().nullable().optional(),
  followerCount: z.number().nonnegative().nullable().optional(),
});

trendsRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = updateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });
  const existing = await prisma.trendItem.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Trend item not found' });
  const d = body.data;

  const metricsChanged = ['views', 'likes', 'comments', 'shares'].some((k) => k in req.body);
  if (metricsChanged) {
    // Preserve yesterday's numbers before replacing them.
    await prisma.metricSnapshot.create({
      data: {
        trendItemId: id,
        views: existing.views,
        likes: existing.likes,
        comments: existing.comments,
        shares: existing.shares,
        trendScore: existing.trendScore,
      },
    });
  }

  const merged = {
    views: d.views !== undefined ? d.views : existing.views,
    likes: d.likes !== undefined ? d.likes : existing.likes,
    comments: d.comments !== undefined ? d.comments : existing.comments,
    shares: d.shares !== undefined ? d.shares : existing.shares,
    publishedAt: d.publishedAt !== undefined ? (d.publishedAt ? new Date(d.publishedAt) : null) : existing.publishedAt,
    crossPlatformCount: existing.crossPlatformCount,
  };
  const { score, breakdown } = computeTrendScore(merged);

  let nicheId = existing.nicheId;
  if (d.nicheName !== undefined) {
    nicheId = d.nicheName
      ? (await prisma.niche.upsert({ where: { name: d.nicheName }, create: { name: d.nicheName }, update: {} })).id
      : null;
  }
  let audioId = existing.audioId;
  if (d.audioName !== undefined) {
    audioId = d.audioName
      ? (await prisma.audio.upsert({ where: { name: d.audioName }, create: { name: d.audioName }, update: {} })).id
      : null;
  }

  const updated = await prisma.trendItem.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.notes !== undefined ? { notes: d.notes } : {}),
      ...(d.country !== undefined ? { country: d.country } : {}),
      ...(d.language !== undefined ? { language: d.language } : {}),
      ...(d.format !== undefined ? { format: d.format } : {}),
      ...(d.saved !== undefined ? { saved: d.saved } : {}),
      ...(d.monitoring !== undefined ? { monitoring: d.monitoring } : {}),
      ...(d.followerCount !== undefined ? { followerCount: d.followerCount } : {}),
      views: merged.views,
      likes: merged.likes,
      comments: merged.comments,
      shares: merged.shares,
      publishedAt: merged.publishedAt,
      nicheId,
      audioId,
      trendScore: score,
      engagementRate: breakdown.inputs.engagementRate,
      engagementEstimated: breakdown.inputs.engagementEstimated,
      viewsPerHour: breakdown.inputs.viewsPerHour,
      scoreBreakdown: JSON.stringify(breakdown),
    },
    include: TREND_INCLUDE,
  });

  if (d.hashtags) {
    await prisma.trendItemHashtag.deleteMany({ where: { trendItemId: id } });
    for (const tag of [...new Set(d.hashtags.map((t) => t.replace(/^#/, '').toLowerCase().trim()).filter(Boolean))]) {
      const hashtag = await prisma.hashtag.upsert({ where: { tag }, create: { tag }, update: {} });
      await prisma.trendItemHashtag.create({ data: { trendItemId: id, hashtagId: hashtag.id } });
    }
  }

  res.json(serializeTrend(updated));
});

trendsRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.trendItem.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Trend item not found' });
  await prisma.trendItem.delete({ where: { id } });
  res.json({ ok: true });
});

/** Refresh metadata from the source platform (where the platform allows it). */
trendsRouter.post('/:id/refresh', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.trendItem.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Trend item not found' });
  if (!existing.url) return res.status(400).json({ error: 'This item has no URL to refresh from.' });
  const result = await importUrl(existing.url);
  const item = await prisma.trendItem.findUnique({ where: { id }, include: TREND_INCLUDE });
  res.json({
    result: result.status,
    message: result.metadataMessage ?? result.message,
    item: item ? serializeTrend(item) : null,
  });
});

const createSchema = updateSchema.extend({
  title: z.string().min(1, 'Title is required for manual entries'),
  url: z.string().nullable().optional(),
  platformId: z.enum(['tiktok', 'instagram', 'youtube', 'google-trends']),
  creatorHandle: z.string().nullable().optional(),
  creatorName: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
});

trendsRouter.post('/', async (req, res) => {
  const body = createSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });
  const result = await upsertTrendItem({ ...body.data });
  if (result.status === 'error') return res.status(400).json({ error: result.message });
  if (result.status === 'duplicate') return res.status(409).json({ error: result.message, itemId: result.itemId });
  const item = await prisma.trendItem.findUnique({ where: { id: result.itemId! }, include: TREND_INCLUDE });
  res.status(201).json(serializeTrend(item!));
});
