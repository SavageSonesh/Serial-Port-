import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { TREND_INCLUDE, serializeTrend } from '../services/trendService.js';

export const compareRouter = Router();

compareRouter.post('/', async (req, res) => {
  const body = z.object({ ids: z.array(z.number().int()).min(2, 'Pick at least 2 trends').max(5, 'Maximum 5 trends') }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid body' });

  const items = await prisma.trendItem.findMany({
    where: { id: { in: body.data.ids } },
    include: TREND_INCLUDE,
  });
  if (items.length < 2) return res.status(404).json({ error: 'Could not find at least two of the selected trends' });

  const serialized = items.map(serializeTrend);

  // Written summary
  const by = <K extends 'views' | 'likes' | 'comments' | 'trendScore' | 'viewsPerHour' | 'engagementRate'>(key: K) =>
    [...serialized].sort((a, b) => (Number(b[key] ?? 0)) - (Number(a[key] ?? 0)))[0];

  const topViews = by('views');
  const topScore = by('trendScore');
  const topVelocity = by('viewsPerHour');
  const topEngagement = by('engagementRate');

  const allHashtags = serialized.flatMap((i) => i.hashtags as string[]);
  const hashtagCounts = new Map<string, number>();
  for (const h of allHashtags) hashtagCounts.set(h, (hashtagCounts.get(h) ?? 0) + 1);
  const sharedHashtags = [...hashtagCounts.entries()].filter(([, c]) => c >= 2).map(([h]) => h);

  const platforms = [...new Set(serialized.map((i) => String((i as { platformId?: string }).platformId)))];

  const sentences: string[] = [];
  sentences.push(
    `Comparing ${serialized.length} trends across ${platforms.length} platform${platforms.length > 1 ? 's' : ''} (${platforms.join(', ')}).`
  );
  if (topScore) sentences.push(`“${truncate(String(topScore.title))}” has the strongest overall trend score (${topScore.trendScore}/100 — ${topScore.trendLabel}).`);
  if (topViews?.views != null) sentences.push(`“${truncate(String(topViews.title))}” leads on raw views (${fmt(Number(topViews.views))}).`);
  if (topVelocity?.viewsPerHour != null)
    sentences.push(`“${truncate(String(topVelocity.title))}” is growing fastest at ${fmt(Number(topVelocity.viewsPerHour))} views/hour.`);
  if (topEngagement?.engagementRate != null)
    sentences.push(
      `“${truncate(String(topEngagement.title))}” has the best engagement rate at ${Number(topEngagement.engagementRate).toFixed(1)}%${
        topEngagement.engagementEstimated ? ' (estimated — shares unavailable)' : ''
      }.`
    );
  if (sharedHashtags.length > 0) sentences.push(`Shared hashtags: ${sharedHashtags.slice(0, 6).map((h) => `#${h}`).join(', ')}.`);
  const audios = serialized.map((i) => (i as { audio?: { name?: string } }).audio?.name).filter(Boolean);
  if (new Set(audios).size === 1 && audios.length >= 2) sentences.push(`All compared items use the same audio (“${audios[0]}”) — a strong signal of a sound-driven trend.`);

  res.json({ items: serialized, summary: sentences.join(' '), sharedHashtags });
});

function truncate(s: string, n = 48): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}
