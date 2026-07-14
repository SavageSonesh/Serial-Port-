import { Router } from 'express';
import { prisma } from '../prisma.js';
import { TREND_INCLUDE, serializeTrend } from '../services/trendService.js';
import { groupByTopic, type SimilarityDoc } from '../lib/similarity.js';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', async (_req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalTrends, newToday, savedIdeas, monitored, topItem, platforms, recent] = await Promise.all([
    prisma.trendItem.count(),
    prisma.trendItem.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.savedIdea.count(),
    prisma.trendItem.count({ where: { monitoring: true } }),
    prisma.trendItem.findFirst({ orderBy: { trendScore: 'desc' }, include: TREND_INCLUDE }),
    prisma.trendItem.groupBy({
      by: ['platformId'],
      _count: { id: true },
      _avg: { trendScore: true, engagementRate: true },
      _sum: { views: true },
    }),
    prisma.trendItem.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: TREND_INCLUDE }),
  ]);

  // Best platform = highest average trend score with at least one item.
  const bestPlatform = [...platforms].sort((a, b) => (b._avg.trendScore ?? 0) - (a._avg.trendScore ?? 0))[0]?.platformId ?? null;

  // Top niches by average score
  const nicheAgg = await prisma.trendItem.groupBy({
    by: ['nicheId'],
    where: { nicheId: { not: null } },
    _count: { id: true },
    _avg: { trendScore: true },
  });
  const nicheIds = nicheAgg.map((n) => n.nicheId!).filter(Boolean);
  const niches = await prisma.niche.findMany({ where: { id: { in: nicheIds } } });
  const nicheMap = new Map(niches.map((n) => [n.id, n.name]));
  const topNiches = nicheAgg
    .map((n) => ({ name: nicheMap.get(n.nicheId!) ?? 'Unknown', count: n._count.id, avgScore: Math.round((n._avg.trendScore ?? 0) * 10) / 10 }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 6);

  // Cross-platform topic count (quick grouping over recent items)
  const forGrouping = await prisma.trendItem.findMany({
    take: 300,
    orderBy: { createdAt: 'desc' },
    include: { hashtags: { include: { hashtag: true } }, audio: true },
  });
  const docs: SimilarityDoc[] = forGrouping.map((i) => ({
    id: i.id,
    platformId: i.platformId,
    title: i.title,
    description: i.description,
    hashtags: i.hashtags.map((h) => h.hashtag.tag),
    audioName: i.audio?.name,
    publishedAt: i.publishedAt,
  }));
  const groups = groupByTopic(docs);
  const crossPlatformTopics = groups.filter((g) => g.platforms.filter((p) => p !== 'google-trends').length >= 2).length;

  // Activity: items added + avg score per day, last 14 days
  const since = new Date(Date.now() - 14 * 86_400_000);
  const recentItems = await prisma.trendItem.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, trendScore: true },
  });
  const activity: { date: string; added: number; avgScore: number }[] = [];
  for (let d = 13; d >= 0; d--) {
    const day = new Date(Date.now() - d * 86_400_000);
    const key = day.toISOString().slice(0, 10);
    const items = recentItems.filter((i) => i.createdAt.toISOString().slice(0, 10) === key);
    activity.push({
      date: key,
      added: items.length,
      avgScore: items.length > 0 ? Math.round((items.reduce((s, i) => s + i.trendScore, 0) / items.length) * 10) / 10 : 0,
    });
  }

  const sampleCount = await prisma.trendItem.count({ where: { isSample: true } });

  res.json({
    totalTrends,
    newToday,
    savedIdeas,
    monitored,
    highestScore: topItem ? { score: topItem.trendScore, item: serializeTrend(topItem) } : null,
    bestPlatform,
    platformComparison: platforms.map((p) => ({
      platformId: p.platformId,
      count: p._count.id,
      avgScore: Math.round((p._avg.trendScore ?? 0) * 10) / 10,
      avgEngagement: p._avg.engagementRate != null ? Math.round(p._avg.engagementRate * 10) / 10 : null,
      totalViews: p._sum.views ?? 0,
    })),
    topNiches,
    crossPlatformTopics,
    recentItems: recent.map(serializeTrend),
    activity,
    hasSampleData: sampleCount > 0,
  });
});
