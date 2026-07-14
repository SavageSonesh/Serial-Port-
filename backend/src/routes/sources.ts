import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { searchYouTube } from '../connectors/youtube.js';
import { fetchGoogleTrends } from '../connectors/googleTrends.js';
import { importUrl } from '../services/trendService.js';
import { TIKTOK_LIMITATION_MESSAGE } from '../connectors/tiktok.js';
import { INSTAGRAM_LIMITATION_MESSAGE } from '../connectors/instagram.js';

export const sourcesRouter = Router();

/** Connector status overview — honest about what each platform allows. */
sourcesRouter.get('/', async (_req, res) => {
  const sources = await prisma.dataSource.findMany({ orderBy: { id: 'asc' } });
  res.json({
    youtubeApiKeyConfigured: Boolean(env.youtubeApiKey), // boolean only — the key itself never leaves the backend
    connectors: [
      {
        type: 'youtube',
        name: 'YouTube',
        capability: env.youtubeApiKey
          ? 'Full metadata + statistics + search via your YouTube Data API key.'
          : 'Basic metadata (title, author, thumbnail) via the free public oEmbed endpoint. Add a free API key in backend/.env for statistics and search.',
        automatic: true,
        limitation: env.youtubeApiKey ? null : 'View/like/comment counts need a free API key or manual entry.',
      },
      {
        type: 'google-trends',
        name: 'Google Trends',
        capability: 'Keyword interest-over-time and related queries via the free unofficial library.',
        automatic: true,
        limitation: 'Unofficial endpoint — occasional rate limits and breakage are expected and handled gracefully.',
      },
      {
        type: 'tiktok',
        name: 'TikTok',
        capability: 'Public oEmbed metadata (title, creator, thumbnail) + manual metrics + CSV import.',
        automatic: false,
        limitation: TIKTOK_LIMITATION_MESSAGE,
      },
      {
        type: 'instagram',
        name: 'Instagram',
        capability: 'URL detection + manual metrics + CSV import.',
        automatic: false,
        limitation: INSTAGRAM_LIMITATION_MESSAGE,
      },
    ],
    savedSources: sources,
  });
});

/** YouTube search (needs API key; clear message without). Optionally import results. */
sourcesRouter.post('/youtube/search', async (req, res) => {
  const body = z
    .object({
      query: z.string().min(1),
      country: z.string().optional(),
      import: z.boolean().optional(),
      maxResults: z.number().int().min(1).max(25).optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Provide a search query' });

  const countryCodes: Record<string, string> = {
    Portugal: 'PT', India: 'IN', Nepal: 'NP', 'United Kingdom': 'GB', 'United States': 'US', Worldwide: 'WW',
  };
  const regionCode = body.data.country ? countryCodes[body.data.country] ?? body.data.country : undefined;

  const result = await searchYouTube(body.data.query, { regionCode, maxResults: body.data.maxResults });

  await prisma.searchQuery.create({
    data: {
      query: body.data.query,
      platformId: 'youtube',
      country: body.data.country ?? null,
      lastRunAt: new Date(),
      resultJson: result.ok ? JSON.stringify(result.results.slice(0, 25)) : null,
    },
  });

  if (!result.ok) return res.status(200).json({ ok: false, results: [], message: result.message });

  let imported = 0;
  if (body.data.import) {
    for (const r of result.results) {
      const ir = await importUrl(r.url, { country: body.data.country });
      if (ir.status === 'created' || ir.status === 'updated') imported++;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  res.json({ ok: true, results: result.results, imported });
});

/** Google Trends keyword search. */
sourcesRouter.post('/google-trends/search', async (req, res) => {
  const body = z
    .object({
      keyword: z.string().min(1),
      country: z.string().optional(),
      timeRange: z.enum(['1d', '7d', '30d', '90d', '12m']).optional(),
      category: z.number().int().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Provide a keyword' });

  const result = await fetchGoogleTrends(body.data);

  await prisma.searchQuery.create({
    data: {
      query: body.data.keyword,
      platformId: 'google-trends',
      country: body.data.country ?? null,
      timeRange: body.data.timeRange ?? '30d',
      category: body.data.category != null ? String(body.data.category) : null,
      lastRunAt: new Date(),
      resultJson: result.ok ? JSON.stringify({ points: result.interestOverTime.length }) : null,
    },
  });

  res.json(result);
});

/** Save a Google Trends result as a TrendItem for scoring/comparison. */
sourcesRouter.post('/google-trends/save', async (req, res) => {
  const body = z
    .object({
      keyword: z.string().min(1),
      country: z.string().optional(),
      avgInterest: z.number().optional(),
      relatedQueries: z.array(z.string()).optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid body' });
  const { keyword, country, avgInterest, relatedQueries } = body.data;

  const geoParam = country && country !== 'Worldwide' ? `&geo=${encodeURIComponent(country)}` : '';
  const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}${geoParam}`;
  const { upsertTrendItem } = await import('../services/trendService.js');
  const result = await upsertTrendItem(
    {
      url,
      title: `Google Trends: ${keyword}`,
      description: [
        avgInterest != null ? `Average search interest: ${Math.round(avgInterest)}/100.` : '',
        relatedQueries && relatedQueries.length > 0 ? `Related queries: ${relatedQueries.slice(0, 8).join(', ')}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
      platformId: 'google-trends',
      country: country ?? null,
      publishedAt: new Date(),
      format: 'other',
    },
    { updateDuplicates: true }
  );
  if (result.status === 'error') return res.status(400).json({ error: result.message });
  res.json(result);
});

/** Recent search history. */
sourcesRouter.get('/history', async (_req, res) => {
  const history = await prisma.searchQuery.findMany({
    where: { isWatchlist: false },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });
  res.json(history);
});
