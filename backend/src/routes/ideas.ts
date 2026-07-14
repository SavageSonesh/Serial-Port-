import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';

export const ideasRouter = Router();

export const IDEA_STATUSES = [
  'idea',
  'researching',
  'script-ready',
  'ready-to-record',
  'recorded',
  'editing',
  'scheduled',
  'published',
  'archived',
] as const;

const ideaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  hook: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  hashtags: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  visualStructure: z.string().nullable().optional(),
  callToAction: z.string().nullable().optional(),
  angle: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(IDEA_STATUSES).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  intendedPlatform: z.string().nullable().optional(),
  plannedRecordingDate: z.string().nullable().optional(),
  recorded: z.boolean().optional(),
  edited: z.boolean().optional(),
  posted: z.boolean().optional(),
  publishedUrl: z.string().nullable().optional(),
  nicheName: z.string().nullable().optional(),
  sourceTrendId: z.number().int().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const IDEA_INCLUDE = { niche: true, tags: { include: { tag: true } }, sourceTrend: { select: { id: true, title: true, url: true } } } as const;

function serializeIdea(idea: { tags?: { tag: { name: string } }[]; [k: string]: unknown }) {
  const { tags, ...rest } = idea;
  return { ...rest, tags: (tags ?? []).map((t) => t.tag.name) };
}

ideasRouter.get('/', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const ideas = await prisma.savedIdea.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ title: { contains: search } }, { notes: { contains: search } }] } : {}),
    },
    include: IDEA_INCLUDE,
    orderBy: [{ updatedAt: 'desc' }],
  });
  res.json(ideas.map(serializeIdea));
});

async function resolveNicheAndDate(d: z.infer<typeof ideaSchema>) {
  let nicheId: number | null | undefined = undefined;
  if (d.nicheName !== undefined) {
    nicheId = d.nicheName
      ? (await prisma.niche.upsert({ where: { name: d.nicheName }, create: { name: d.nicheName }, update: {} })).id
      : null;
  }
  let plannedRecordingDate: Date | null | undefined = undefined;
  if (d.plannedRecordingDate !== undefined) {
    plannedRecordingDate = d.plannedRecordingDate ? new Date(d.plannedRecordingDate) : null;
    if (plannedRecordingDate && isNaN(plannedRecordingDate.getTime())) plannedRecordingDate = null;
  }
  return { nicheId, plannedRecordingDate };
}

async function setIdeaTags(ideaId: number, tags: string[]) {
  await prisma.ideaTagOnIdea.deleteMany({ where: { ideaId } });
  for (const name of [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))]) {
    const tag = await prisma.ideaTag.upsert({ where: { name }, create: { name }, update: {} });
    await prisma.ideaTagOnIdea.create({ data: { ideaId, tagId: tag.id } });
  }
}

ideasRouter.post('/', async (req, res) => {
  const body = ideaSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });
  const d = body.data;
  const { nicheId, plannedRecordingDate } = await resolveNicheAndDate(d);
  const { tags, nicheName: _n, plannedRecordingDate: _p, ...fields } = d;
  const idea = await prisma.savedIdea.create({
    data: {
      ...fields,
      ...(nicheId !== undefined ? { nicheId } : {}),
      ...(plannedRecordingDate !== undefined ? { plannedRecordingDate } : {}),
    },
  });
  if (tags) await setIdeaTags(idea.id, tags);
  const full = await prisma.savedIdea.findUnique({ where: { id: idea.id }, include: IDEA_INCLUDE });
  res.status(201).json(serializeIdea(full!));
});

ideasRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const body = ideaSchema.partial().safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });
  const existing = await prisma.savedIdea.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Idea not found' });
  const d = body.data;
  const { nicheId, plannedRecordingDate } = await resolveNicheAndDate(d as z.infer<typeof ideaSchema>);
  const { tags, nicheName: _n, plannedRecordingDate: _p, ...fields } = d;
  await prisma.savedIdea.update({
    where: { id },
    data: {
      ...fields,
      ...(nicheId !== undefined ? { nicheId } : {}),
      ...(plannedRecordingDate !== undefined ? { plannedRecordingDate } : {}),
    },
  });
  if (tags) await setIdeaTags(id, tags);
  const full = await prisma.savedIdea.findUnique({ where: { id }, include: IDEA_INCLUDE });
  res.json(serializeIdea(full!));
});

ideasRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.savedIdea.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Idea not found' });
  await prisma.savedIdea.delete({ where: { id } });
  res.json({ ok: true });
});
