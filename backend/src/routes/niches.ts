import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';

export const nichesRouter = Router();

nichesRouter.get('/', async (_req, res) => {
  const niches = await prisma.niche.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { trendItems: true, savedIdeas: true } } },
  });
  res.json(
    niches.map((n) => ({
      id: n.id,
      name: n.name,
      isDefault: n.isDefault,
      trendCount: n._count.trendItems,
      ideaCount: n._count.savedIdeas,
    }))
  );
});

nichesRouter.post('/', async (req, res) => {
  const body = z.object({ name: z.string().min(1).max(80) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Provide a niche name (max 80 chars)' });
  const name = body.data.name.trim();
  const existing = await prisma.niche.findUnique({ where: { name } });
  if (existing) return res.status(409).json({ error: 'That niche already exists' });
  const niche = await prisma.niche.create({ data: { name } });
  res.status(201).json(niche);
});

nichesRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const niche = await prisma.niche.findUnique({ where: { id } });
  if (!niche) return res.status(404).json({ error: 'Niche not found' });
  // Detach items instead of deleting them.
  await prisma.trendItem.updateMany({ where: { nicheId: id }, data: { nicheId: null } });
  await prisma.savedIdea.updateMany({ where: { nicheId: id }, data: { nicheId: null } });
  await prisma.niche.delete({ where: { id } });
  res.json({ ok: true });
});

// --- Keyword watchlists (stored as SearchQuery rows with isWatchlist=true) ---

nichesRouter.get('/watchlist', async (_req, res) => {
  const items = await prisma.searchQuery.findMany({ where: { isWatchlist: true }, orderBy: { createdAt: 'desc' } });
  res.json(items);
});

nichesRouter.post('/watchlist', async (req, res) => {
  const body = z
    .object({
      query: z.string().min(1).max(120),
      platformId: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Provide a keyword (max 120 chars)' });
  const item = await prisma.searchQuery.create({
    data: {
      query: body.data.query.trim(),
      platformId: body.data.platformId ?? null,
      country: body.data.country ?? null,
      isWatchlist: true,
    },
  });
  res.status(201).json(item);
});

nichesRouter.delete('/watchlist/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.searchQuery.findUnique({ where: { id } });
  if (!existing || !existing.isWatchlist) return res.status(404).json({ error: 'Watchlist entry not found' });
  await prisma.searchQuery.delete({ where: { id } });
  res.json({ ok: true });
});
