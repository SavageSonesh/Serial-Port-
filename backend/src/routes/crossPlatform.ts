import { Router } from 'express';
import { prisma } from '../prisma.js';
import { TREND_INCLUDE, serializeTrend, recomputeCrossPlatform } from '../services/trendService.js';
import { groupByTopic, type SimilarityDoc } from '../lib/similarity.js';

export const crossPlatformRouter = Router();

crossPlatformRouter.get('/', async (_req, res) => {
  const items = await prisma.trendItem.findMany({
    take: 500,
    orderBy: { createdAt: 'desc' },
    include: TREND_INCLUDE,
  });

  const docs: SimilarityDoc[] = items.map((i) => ({
    id: i.id,
    platformId: i.platformId,
    title: i.title,
    description: i.description,
    hashtags: i.hashtags.map((h) => h.hashtag.tag),
    audioName: i.audio?.name,
    publishedAt: i.publishedAt,
  }));

  const groups = groupByTopic(docs);

  // Keep cached crossPlatformCount + trend scores in sync with the grouping.
  await recomputeCrossPlatform(groups);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const payload = groups.map((g) => ({
    label: g.label,
    platforms: g.platforms,
    sharedKeywords: g.sharedKeywords,
    items: g.itemIds
      .map((id) => itemMap.get(id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
      .map(serializeTrend),
  }));

  res.json({ groups: payload });
});
