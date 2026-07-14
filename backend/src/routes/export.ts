import { Router } from 'express';
import { prisma } from '../prisma.js';
import { toCsv } from '../lib/csv.js';
import { TREND_INCLUDE, serializeTrend } from '../services/trendService.js';

export const exportRouter = Router();

async function loadTrends() {
  return prisma.trendItem.findMany({ include: TREND_INCLUDE, orderBy: { trendScore: 'desc' } });
}

exportRouter.get('/trends.csv', async (_req, res) => {
  const items = await loadTrends();
  const header = [
    'title', 'platform', 'url', 'creator', 'views', 'likes', 'comments', 'shares', 'followers',
    'published', 'viewsPerHour', 'engagementRate', 'engagementEstimated', 'trendScore', 'trendLabel',
    'niche', 'country', 'language', 'format', 'audio', 'hashtags', 'notes', 'saved', 'monitoring', 'isSample',
  ];
  const rows = items.map(serializeTrend).map((i) => [
    String(i.title ?? ''), String((i as { platformId?: string }).platformId ?? ''), String(i.url ?? ''),
    (i as { creator?: { handle?: string } }).creator?.handle ?? '',
    i.views as number | null, i.likes as number | null, i.comments as number | null, i.shares as number | null,
    i.followerCount as number | null,
    i.publishedAt ? new Date(i.publishedAt as string | Date).toISOString() : '',
    i.viewsPerHour as number | null, i.engagementRate as number | null, String(i.engagementEstimated ?? false),
    i.trendScore as number, i.trendLabel as string,
    (i as { niche?: { name?: string } }).niche?.name ?? '',
    String(i.country ?? ''), String(i.language ?? ''), String(i.format ?? ''),
    (i as { audio?: { name?: string } }).audio?.name ?? '',
    (i.hashtags as string[]).join(' '),
    String(i.notes ?? ''), String(i.saved), String(i.monitoring), String(i.isSample),
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="trendradar-trends.csv"');
  res.send(toCsv([header, ...rows]));
});

exportRouter.get('/trends.json', async (_req, res) => {
  const items = await loadTrends();
  res.setHeader('Content-Disposition', 'attachment; filename="trendradar-trends.json"');
  res.json({ exportedAt: new Date().toISOString(), items: items.map(serializeTrend) });
});

exportRouter.get('/ideas.csv', async (_req, res) => {
  const ideas = await prisma.savedIdea.findMany({ include: { niche: true, tags: { include: { tag: true } } }, orderBy: { updatedAt: 'desc' } });
  const header = ['title', 'status', 'priority', 'category', 'niche', 'intendedPlatform', 'hook', 'caption', 'hashtags', 'format', 'duration', 'callToAction', 'plannedRecordingDate', 'recorded', 'edited', 'posted', 'publishedUrl', 'tags', 'notes'];
  const rows = ideas.map((i) => [
    i.title, i.status, i.priority, i.category ?? '', i.niche?.name ?? '', i.intendedPlatform ?? '',
    i.hook ?? '', i.caption ?? '', i.hashtags ?? '', i.format ?? '', i.duration ?? '', i.callToAction ?? '',
    i.plannedRecordingDate ? i.plannedRecordingDate.toISOString().slice(0, 10) : '',
    String(i.recorded), String(i.edited), String(i.posted), i.publishedUrl ?? '',
    i.tags.map((t) => t.tag.name).join(' '), i.notes ?? '',
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="trendradar-ideas.csv"');
  res.send(toCsv([header, ...rows]));
});

exportRouter.get('/ideas.json', async (_req, res) => {
  const ideas = await prisma.savedIdea.findMany({ include: { niche: true, tags: { include: { tag: true } } }, orderBy: { updatedAt: 'desc' } });
  res.setHeader('Content-Disposition', 'attachment; filename="trendradar-ideas.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    ideas: ideas.map(({ tags, ...rest }) => ({ ...rest, tags: tags.map((t) => t.tag.name) })),
  });
});

/** Trend report: top trends, best niches/platforms, fastest growing, recommendations. */
exportRouter.get('/report', async (_req, res) => {
  const items = (await loadTrends()).map(serializeTrend);

  const platformAgg = await prisma.trendItem.groupBy({
    by: ['platformId'],
    _count: { id: true },
    _avg: { trendScore: true, engagementRate: true },
  });

  const nicheAgg = await prisma.trendItem.groupBy({
    by: ['nicheId'],
    where: { nicheId: { not: null } },
    _count: { id: true },
    _avg: { trendScore: true },
  });
  const niches = await prisma.niche.findMany({ where: { id: { in: nicheAgg.map((n) => n.nicheId!).filter(Boolean) } } });
  const nicheMap = new Map(niches.map((n) => [n.id, n.name]));

  // Fastest growing: compare latest metrics with oldest snapshot
  const monitored = await prisma.trendItem.findMany({
    where: { snapshots: { some: {} } },
    include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
    take: 200,
  });
  const growth = monitored
    .map((m) => {
      const first = m.snapshots[0];
      if (!first || first.views == null || m.views == null || first.views <= 0) return null;
      const days = Math.max((Date.now() - first.capturedAt.getTime()) / 86_400_000, 0.04);
      return {
        id: m.id,
        title: m.title,
        platformId: m.platformId,
        viewsThen: first.views,
        viewsNow: m.views,
        growthPct: Math.round(((m.views - first.views) / first.views) * 1000) / 10,
        viewsPerDay: Math.round((m.views - first.views) / days),
      };
    })
    .filter((g): g is NonNullable<typeof g> => g != null && g.growthPct > 0)
    .sort((a, b) => b.growthPct - a.growthPct)
    .slice(0, 10);

  const ideas = await prisma.savedIdea.findMany({ orderBy: { updatedAt: 'desc' }, take: 10, include: { niche: true } });

  res.setHeader('Content-Disposition', 'attachment; filename="trendradar-report.json"');
  res.json({
    generatedAt: new Date().toISOString(),
    note: 'TrendRadar Local report — generated from your locally collected data only.',
    topTrends: items.slice(0, 15),
    bestNiches: nicheAgg
      .map((n) => ({ name: nicheMap.get(n.nicheId!) ?? 'Unknown', items: n._count.id, avgScore: Math.round((n._avg.trendScore ?? 0) * 10) / 10 }))
      .sort((a, b) => b.avgScore - a.avgScore),
    bestPlatforms: platformAgg
      .map((p) => ({
        platform: p.platformId,
        items: p._count.id,
        avgScore: Math.round((p._avg.trendScore ?? 0) * 10) / 10,
        avgEngagement: p._avg.engagementRate != null ? Math.round(p._avg.engagementRate * 10) / 10 : null,
      }))
      .sort((a, b) => b.avgScore - a.avgScore),
    highestEngagement: [...items]
      .filter((i) => i.engagementRate != null)
      .sort((a, b) => Number(b.engagementRate) - Number(a.engagementRate))
      .slice(0, 10),
    fastestGrowing: growth,
    recommendedIdeas: ideas.map((i) => ({ title: i.title, status: i.status, priority: i.priority, niche: i.niche?.name ?? null })),
  });
});
