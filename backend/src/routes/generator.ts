import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { generateIdeas, CATEGORIES, type TrendContext, type GeneratedIdea } from '../lib/ideas.js';
import { tokenize } from '../lib/similarity.js';
import { analyzeStructure } from '../lib/structure.js';
import { ollamaGenerate, ollamaStatus } from '../connectors/ollama.js';
import { logger } from '../logger.js';

export const generatorRouter = Router();

generatorRouter.get('/categories', (_req, res) => {
  res.json(CATEGORIES.map((c) => ({ id: c.id, name: c.name })));
});

async function buildContext(nicheName?: string, keywordsExtra: string[] = []): Promise<TrendContext> {
  const where = nicheName ? { niche: { name: nicheName } } : {};
  const trends = await prisma.trendItem.findMany({
    where,
    orderBy: { trendScore: 'desc' },
    take: 40,
    include: { hashtags: { include: { hashtag: true } }, audio: true },
  });

  const tokenCounts = new Map<string, number>();
  for (const t of trends) {
    for (const tok of new Set([...tokenize(t.title), ...tokenize(t.description)])) {
      tokenCounts.set(tok, (tokenCounts.get(tok) ?? 0) + 1);
    }
  }
  const keywords = [
    ...keywordsExtra,
    ...[...tokenCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t),
  ];

  const hashtagCounts = new Map<string, number>();
  for (const t of trends) for (const h of t.hashtags) hashtagCounts.set(h.hashtag.tag, (hashtagCounts.get(h.hashtag.tag) ?? 0) + 1);
  const hashtags = [...hashtagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);

  const audioNames = [...new Set(trends.map((t) => t.audio?.name).filter((n): n is string => Boolean(n)))].slice(0, 5);

  return {
    keywords: [...new Set(keywords)],
    hashtags,
    audioNames,
    niche: nicheName ?? null,
    topTitle: trends[0]?.title ?? null,
  };
}

const genSchema = z.object({
  niche: z.string().optional(),
  categoryId: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(10).optional(),
  useAi: z.boolean().optional(),
});

generatorRouter.post('/ideas', async (req, res) => {
  const body = genSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });
  const { niche, categoryId, keywords = [], count = 5, useAi = false } = body.data;

  const ctx = await buildContext(niche, keywords);
  const templateIdeas = generateIdeas(ctx, { categoryId, count });

  if (!useAi) {
    return res.json({ ideas: templateIdeas, source: 'templates' });
  }

  // Optional local AI path — degrades to templates on any failure.
  const status = await ollamaStatus();
  if (!status.enabled || !status.reachable) {
    return res.json({ ideas: templateIdeas, source: 'templates', aiMessage: status.message });
  }
  const prompt = buildOllamaPrompt(ctx, categoryId, count);
  const ai = await ollamaGenerate(prompt);
  if (!ai.ok || !ai.text) {
    return res.json({ ideas: templateIdeas, source: 'templates', aiMessage: ai.message });
  }
  const parsed = parseAiIdeas(ai.text);
  if (parsed.length === 0) {
    return res.json({ ideas: templateIdeas, source: 'templates', aiMessage: 'Local AI responded but the output could not be parsed — showing template ideas instead.' });
  }
  res.json({ ideas: parsed, source: `ollama (${status.model})` });
});

function buildOllamaPrompt(ctx: TrendContext, categoryId: string | undefined, count: number): string {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return [
    `You are a short-form video strategist. Generate ${count} original content ideas.`,
    ctx.niche ? `Niche: ${ctx.niche}.` : '',
    cat ? `Category: ${cat.name}.` : '',
    ctx.keywords.length > 0 ? `Trending keywords from my research: ${ctx.keywords.slice(0, 10).join(', ')}.` : '',
    ctx.hashtags.length > 0 ? `Trending hashtags: ${ctx.hashtags.slice(0, 8).map((h) => '#' + h).join(' ')}.` : '',
    'Respond ONLY with a JSON array. Each element must have exactly these string fields:',
    'title, videoIdea, hook, caption, hashtags (array of strings, no # prefix), format, duration, visualStructure, callToAction, angle, rationale, category.',
    'No markdown, no commentary — raw JSON only.',
  ]
    .filter(Boolean)
    .join('\n');
}

function parseAiIdeas(text: string): GeneratedIdea[] {
  try {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1) return [];
    const arr = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
      .map((x) => ({
        title: str(x.title) || 'Untitled idea',
        videoIdea: str(x.videoIdea),
        hook: str(x.hook),
        caption: str(x.caption),
        hashtags: Array.isArray(x.hashtags) ? x.hashtags.filter((h): h is string => typeof h === 'string').map((h) => h.replace(/^#/, '')) : [],
        format: str(x.format),
        duration: str(x.duration),
        visualStructure: str(x.visualStructure),
        callToAction: str(x.callToAction),
        angle: str(x.angle),
        rationale: str(x.rationale),
        category: str(x.category) || 'AI generated',
      }))
      .slice(0, 10);
  } catch (err) {
    logger.warn('Failed to parse Ollama ideas', { error: String(err) });
    return [];
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

const structureSchema = z.object({
  description: z.string().min(10, 'Describe the video in at least a sentence'),
  title: z.string().optional(),
  captionText: z.string().optional(),
  durationSeconds: z.number().positive().max(3600).optional(),
  platform: z.string().optional(),
});

generatorRouter.post('/analyze-structure', async (req, res) => {
  const body = structureSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });
  res.json(analyzeStructure(body.data));
});

generatorRouter.get('/ollama-status', async (_req, res) => {
  res.json(await ollamaStatus());
});
