// Database integration tests against a throwaway SQLite file (see globalSetup).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/prisma.js';
import { upsertTrendItem } from '../src/services/trendService.js';

async function resetData() {
  await prisma.metricSnapshot.deleteMany();
  await prisma.trendItemHashtag.deleteMany();
  await prisma.ideaTagOnIdea.deleteMany();
  await prisma.savedIdea.deleteMany();
  await prisma.trendItem.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.audio.deleteMany();
  await prisma.ideaTag.deleteMany();
}

beforeAll(async () => {
  for (const p of [
    { id: 'tiktok', name: 'TikTok' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'youtube', name: 'YouTube' },
    { id: 'google-trends', name: 'Google Trends' },
  ]) {
    await prisma.platform.upsert({ where: { id: p.id }, create: p, update: {} });
  }
});

beforeEach(resetData);
afterAll(async () => {
  await prisma.$disconnect();
});

describe('upsertTrendItem', () => {
  it('creates an item with computed score fields and hashtags', async () => {
    const r = await upsertTrendItem({
      url: 'https://www.tiktok.com/@tester/video/111',
      title: 'Test video #testing #cats',
      views: 100_000,
      likes: 9_000,
      comments: 600,
      shares: 400,
      publishedAt: new Date(Date.now() - 5 * 3_600_000),
      nicheName: 'Testing niche',
      audioName: 'test beat',
    });
    expect(r.status).toBe('created');
    const item = await prisma.trendItem.findUnique({
      where: { id: r.itemId! },
      include: { hashtags: { include: { hashtag: true } }, niche: true, audio: true, creator: true },
    });
    expect(item?.platformId).toBe('tiktok');
    expect(item?.trendScore).toBeGreaterThan(0);
    expect(item?.engagementRate).toBeCloseTo(10, 0);
    expect(item?.engagementEstimated).toBe(false);
    expect(item?.viewsPerHour).toBeCloseTo(20_000, -2);
    expect(item?.hashtags.map((h) => h.hashtag.tag).sort()).toEqual(['cats', 'testing']);
    expect(item?.niche?.name).toBe('Testing niche');
    expect(item?.audio?.name).toBe('test beat');
    expect(item?.creator?.handle).toBe('tester');
    expect(item?.scoreBreakdown && JSON.parse(item.scoreBreakdown).weights.velocity).toBe(0.35);
  });

  it('accepts items with no metrics at all (never rejects)', async () => {
    const r = await upsertTrendItem({ platformId: 'instagram', title: 'Manual entry, no numbers yet' });
    expect(r.status).toBe('created');
    const item = await prisma.trendItem.findUnique({ where: { id: r.itemId! } });
    expect(item?.views).toBeNull();
    expect(item?.engagementRate).toBeNull();
  });

  it('detects duplicates across URL variants', async () => {
    const first = await upsertTrendItem({ url: 'https://youtu.be/dupTest01', title: 'Original', views: 100 });
    expect(first.status).toBe('created');
    const dup = await upsertTrendItem({ url: 'https://www.youtube.com/watch?v=dupTest01&feature=share', title: 'Copy' });
    expect(dup.status).toBe('duplicate');
    expect(dup.itemId).toBe(first.itemId);
    expect(await prisma.trendItem.count()).toBe(1);
  });

  it('updates duplicates when requested and preserves history as a snapshot', async () => {
    const first = await upsertTrendItem({ url: 'https://youtu.be/growTest01', title: 'Day 1', views: 1000, likes: 100 });
    const updated = await upsertTrendItem(
      { url: 'https://www.youtube.com/watch?v=growTest01', views: 5000, likes: 450 },
      { updateDuplicates: true }
    );
    expect(updated.status).toBe('updated');
    expect(updated.itemId).toBe(first.itemId);

    const item = await prisma.trendItem.findUnique({
      where: { id: first.itemId! },
      include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
    });
    expect(item?.views).toBe(5000);
    expect(item?.title).toBe('Day 1'); // untouched fields survive
    // Yesterday's number is preserved, not replaced:
    const snapshotViews = item?.snapshots.map((s) => s.views);
    expect(snapshotViews).toContain(1000);
  });

  it('rejects items with no detectable platform', async () => {
    const r = await upsertTrendItem({ title: 'Mystery content' });
    expect(r.status).toBe('error');
  });
});

describe('SavedIdea creation', () => {
  it('creates an idea with tags, status and priority', async () => {
    const idea = await prisma.savedIdea.create({
      data: { title: 'My great idea', status: 'researching', priority: 'high', intendedPlatform: 'tiktok' },
    });
    const tag = await prisma.ideaTag.upsert({ where: { name: 'series' }, create: { name: 'series' }, update: {} });
    await prisma.ideaTagOnIdea.create({ data: { ideaId: idea.id, tagId: tag.id } });

    const full = await prisma.savedIdea.findUnique({ where: { id: idea.id }, include: { tags: { include: { tag: true } } } });
    expect(full?.status).toBe('researching');
    expect(full?.priority).toBe('high');
    expect(full?.tags.map((t) => t.tag.name)).toEqual(['series']);
    expect(full?.recorded).toBe(false);
  });

  it('tracks workflow flags through to published', async () => {
    const idea = await prisma.savedIdea.create({ data: { title: 'Workflow test' } });
    await prisma.savedIdea.update({
      where: { id: idea.id },
      data: { status: 'published', recorded: true, edited: true, posted: true, publishedUrl: 'https://www.tiktok.com/@me/video/1' },
    });
    const done = await prisma.savedIdea.findUnique({ where: { id: idea.id } });
    expect(done?.posted).toBe(true);
    expect(done?.publishedUrl).toContain('tiktok.com');
  });
});

describe('database operations', () => {
  it('cascades hashtag/snapshot links when a trend is deleted', async () => {
    const r = await upsertTrendItem({
      url: 'https://www.tiktok.com/@x/video/222',
      title: 'To delete #gone',
      views: 10,
    });
    await prisma.trendItem.delete({ where: { id: r.itemId! } });
    expect(await prisma.trendItemHashtag.count({ where: { trendItemId: r.itemId! } })).toBe(0);
    expect(await prisma.metricSnapshot.count({ where: { trendItemId: r.itemId! } })).toBe(0);
  });

  it('enforces unique niches and reuses them', async () => {
    await upsertTrendItem({ platformId: 'youtube', title: 'A', nicheName: 'Same Niche' });
    await upsertTrendItem({ platformId: 'tiktok', title: 'B', nicheName: 'Same Niche' });
    expect(await prisma.niche.count({ where: { name: 'Same Niche' } })).toBe(1);
  });

  it('stores and retrieves app settings', async () => {
    await prisma.appSetting.upsert({ where: { key: 'defaultCountry' }, create: { key: 'defaultCountry', value: 'Portugal' }, update: { value: 'Portugal' } });
    const row = await prisma.appSetting.findUnique({ where: { key: 'defaultCountry' } });
    expect(row?.value).toBe('Portugal');
  });
});
