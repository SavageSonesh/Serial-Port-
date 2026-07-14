// Central service for creating/updating TrendItems: duplicate detection,
// score computation, hashtag/audio/creator upserts and metric snapshots.

import { prisma } from '../prisma.js';
import { computeTrendScore, trendLabel } from '../lib/scoring.js';
import { detectPlatform, extractHashtags, type PlatformId } from '../lib/platform.js';
import { fetchYouTubeMetadata } from '../connectors/youtube.js';
import { fetchTikTokMetadata } from '../connectors/tiktok.js';
import { fetchInstagramMetadata } from '../connectors/instagram.js';
import type { FetchedMetadata } from '../connectors/youtube.js';
import { logger } from '../logger.js';

export interface TrendItemInput {
  url?: string | null;
  title?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  platformId?: PlatformId | string;
  creatorHandle?: string | null;
  creatorName?: string | null;
  followerCount?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  publishedAt?: string | Date | null;
  format?: string | null;
  country?: string | null;
  language?: string | null;
  audioName?: string | null;
  nicheName?: string | null;
  hashtags?: string[];
  notes?: string | null;
  saved?: boolean;
  monitoring?: boolean;
  isSample?: boolean;
}

export interface UpsertResult {
  status: 'created' | 'updated' | 'duplicate' | 'error';
  itemId?: number;
  message?: string;
}

const TREND_INCLUDE = {
  platform: true,
  creator: true,
  niche: true,
  audio: true,
  hashtags: { include: { hashtag: true } },
} as const;

export { TREND_INCLUDE };

// Return type is intentionally loose: routes read a superset of fields that
// varies with the Prisma `include` used at each call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeTrend(item: {
  [k: string]: any;
  trendScore: number;
  hashtags?: { hashtag: { tag: string } }[];
  publishedAt?: Date | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Record<string, any> & { hashtags: string[]; hoursSincePublished: number | null; trendLabel: string; trendScore: number } {
  const { hashtags, ...rest } = item;
  const hours = item.publishedAt ? Math.max(0, (Date.now() - new Date(item.publishedAt).getTime()) / 3_600_000) : null;
  return {
    ...rest,
    hashtags: (hashtags ?? []).map((h) => h.hashtag.tag),
    hoursSincePublished: hours == null ? null : Math.round(hours * 10) / 10,
    trendLabel: trendLabel(item.trendScore),
  };
}

/** Recompute cached score fields for a metric set. */
function scoreFields(input: {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  publishedAt?: Date | string | null;
  crossPlatformCount?: number;
}) {
  const { score, breakdown } = computeTrendScore(input);
  return {
    trendScore: score,
    engagementRate: breakdown.inputs.engagementRate,
    engagementEstimated: breakdown.inputs.engagementEstimated,
    viewsPerHour: breakdown.inputs.viewsPerHour,
    scoreBreakdown: JSON.stringify(breakdown),
  };
}

async function upsertCreator(platformId: string, handle?: string | null, name?: string | null, followers?: number | null) {
  if (!handle) return null;
  const creator = await prisma.creator.upsert({
    where: { handle_platformId: { handle, platformId } },
    create: { handle, displayName: name ?? handle, platformId, followerCount: followers ?? undefined },
    update: {
      displayName: name ?? undefined,
      ...(followers != null ? { followerCount: followers } : {}),
    },
  });
  return creator.id;
}

async function upsertAudio(name?: string | null) {
  if (!name?.trim()) return null;
  const audio = await prisma.audio.upsert({
    where: { name: name.trim() },
    create: { name: name.trim() },
    update: {},
  });
  return audio.id;
}

async function upsertNiche(name?: string | null) {
  if (!name?.trim()) return null;
  const niche = await prisma.niche.upsert({
    where: { name: name.trim() },
    create: { name: name.trim() },
    update: {},
  });
  return niche.id;
}

async function setHashtags(trendItemId: number, tags: string[]) {
  await prisma.trendItemHashtag.deleteMany({ where: { trendItemId } });
  for (const tag of [...new Set(tags.map((t) => t.replace(/^#/, '').toLowerCase().trim()).filter(Boolean))]) {
    const hashtag = await prisma.hashtag.upsert({ where: { tag }, create: { tag }, update: {} });
    await prisma.trendItemHashtag.create({ data: { trendItemId, hashtagId: hashtag.id } });
  }
}

/**
 * Create or update a trend item. Duplicate URLs update the existing item
 * (taking a metric snapshot first) instead of creating a copy.
 * Missing metrics never cause rejection.
 */
export async function upsertTrendItem(input: TrendItemInput, opts: { updateDuplicates?: boolean } = {}): Promise<UpsertResult> {
  try {
    let urlKey: string | null = null;
    let cleanUrl: string | null = input.url?.trim() || null;
    let platformId = input.platformId as string | undefined;
    let format = input.format ?? null;

    if (cleanUrl) {
      const detected = detectPlatform(cleanUrl);
      if (detected) {
        urlKey = detected.urlKey;
        cleanUrl = detected.cleanUrl;
        platformId = platformId ?? detected.platformId;
        format = format ?? detected.format;
        if (!input.creatorHandle && detected.handle) input.creatorHandle = detected.handle;
      } else {
        urlKey = cleanUrl.toLowerCase();
      }
    }
    if (!platformId) {
      return { status: 'error', message: 'Could not detect the platform. Provide a platform or a recognisable URL.' };
    }

    const platform = await prisma.platform.findUnique({ where: { id: platformId } });
    if (!platform) return { status: 'error', message: `Unknown platform "${platformId}".` };

    const existing = urlKey ? await prisma.trendItem.findUnique({ where: { urlKey } }) : null;

    const hashtags = [
      ...(input.hashtags ?? []),
      ...extractHashtags(input.title),
      ...extractHashtags(input.description),
    ];

    const creatorId = await upsertCreator(platformId, input.creatorHandle, input.creatorName, input.followerCount);
    const audioId = await upsertAudio(input.audioName);
    const nicheId = await upsertNiche(input.nicheName);

    const publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
    const validPublishedAt = publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null;

    if (existing) {
      if (!opts.updateDuplicates) {
        return { status: 'duplicate', itemId: existing.id, message: 'This URL is already in your library.' };
      }
      // Preserve history: snapshot the current metrics before overwriting.
      await prisma.metricSnapshot.create({
        data: {
          trendItemId: existing.id,
          views: existing.views,
          likes: existing.likes,
          comments: existing.comments,
          shares: existing.shares,
          trendScore: existing.trendScore,
        },
      });
      const merged = {
        views: input.views ?? existing.views,
        likes: input.likes ?? existing.likes,
        comments: input.comments ?? existing.comments,
        shares: input.shares ?? existing.shares,
        publishedAt: validPublishedAt ?? existing.publishedAt,
        crossPlatformCount: existing.crossPlatformCount,
      };
      const updated = await prisma.trendItem.update({
        where: { id: existing.id },
        data: {
          title: input.title ?? existing.title,
          description: input.description ?? existing.description,
          thumbnailUrl: input.thumbnailUrl ?? existing.thumbnailUrl,
          views: merged.views,
          likes: merged.likes,
          comments: merged.comments,
          shares: merged.shares,
          followerCount: input.followerCount ?? existing.followerCount,
          publishedAt: merged.publishedAt,
          format: format ?? existing.format,
          country: input.country ?? existing.country,
          language: input.language ?? existing.language,
          notes: input.notes ?? existing.notes,
          ...(creatorId ? { creatorId } : {}),
          ...(audioId ? { audioId } : {}),
          ...(nicheId ? { nicheId } : {}),
          ...(input.saved != null ? { saved: input.saved } : {}),
          ...(input.monitoring != null ? { monitoring: input.monitoring } : {}),
          ...scoreFields(merged),
        },
      });
      if (hashtags.length > 0) await setHashtags(updated.id, hashtags);
      return { status: 'updated', itemId: updated.id, message: 'Existing item updated; previous metrics preserved as a snapshot.' };
    }

    const created = await prisma.trendItem.create({
      data: {
        urlKey,
        url: cleanUrl,
        title: input.title?.trim() || cleanUrl || '(untitled)',
        description: input.description ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        platformId,
        creatorId,
        views: input.views ?? null,
        likes: input.likes ?? null,
        comments: input.comments ?? null,
        shares: input.shares ?? null,
        followerCount: input.followerCount ?? null,
        publishedAt: validPublishedAt,
        format,
        country: input.country ?? null,
        language: input.language ?? null,
        audioId,
        nicheId,
        notes: input.notes ?? null,
        saved: input.saved ?? false,
        monitoring: input.monitoring ?? false,
        isSample: input.isSample ?? false,
        ...scoreFields({ ...input, publishedAt: validPublishedAt }),
      },
    });
    // Initial snapshot so growth can be measured from day one.
    if (input.views != null || input.likes != null || input.comments != null) {
      await prisma.metricSnapshot.create({
        data: {
          trendItemId: created.id,
          views: input.views ?? null,
          likes: input.likes ?? null,
          comments: input.comments ?? null,
          shares: input.shares ?? null,
          trendScore: created.trendScore,
        },
      });
    }
    if (hashtags.length > 0) await setHashtags(created.id, hashtags);
    return { status: 'created', itemId: created.id };
  } catch (err) {
    logger.error('upsertTrendItem failed', { error: String(err) });
    return { status: 'error', message: `Could not save item: ${String(err)}` };
  }
}

/** Fetch whatever public metadata each platform allows, honestly reporting gaps. */
export async function fetchMetadataForUrl(url: string): Promise<{ detected: ReturnType<typeof detectPlatform>; metadata: FetchedMetadata | null }> {
  const detected = detectPlatform(url);
  if (!detected) return { detected: null, metadata: null };
  switch (detected.platformId) {
    case 'youtube':
      return { detected, metadata: detected.contentId ? await fetchYouTubeMetadata(detected.contentId) : null };
    case 'tiktok':
      return { detected, metadata: await fetchTikTokMetadata(detected.cleanUrl) };
    case 'instagram':
      return { detected, metadata: await fetchInstagramMetadata(detected.cleanUrl) };
    default:
      return { detected, metadata: null };
  }
}

/** Import a URL: detect platform, fetch allowed metadata, upsert. */
export async function importUrl(url: string, extra: Partial<TrendItemInput> = {}): Promise<UpsertResult & { metadataMessage?: string }> {
  const { detected, metadata } = await fetchMetadataForUrl(url);
  if (!detected) {
    return {
      status: 'error',
      message: 'Unrecognised URL. Supported: TikTok, Instagram, YouTube / YouTube Shorts. You can still add it via Manual Entry.',
    };
  }
  const result = await upsertTrendItem(
    {
      url: detected.cleanUrl,
      title: metadata?.title ?? extra.title,
      description: metadata?.description ?? extra.description,
      thumbnailUrl: metadata?.thumbnailUrl ?? extra.thumbnailUrl,
      platformId: detected.platformId,
      creatorHandle: metadata?.creatorHandle ?? extra.creatorHandle ?? detected.handle,
      creatorName: metadata?.creatorName ?? extra.creatorName,
      views: metadata?.views ?? extra.views,
      likes: metadata?.likes ?? extra.likes,
      comments: metadata?.comments ?? extra.comments,
      shares: extra.shares,
      followerCount: extra.followerCount,
      publishedAt: metadata?.publishedAt ?? extra.publishedAt,
      format: extra.format ?? detected.format,
      country: extra.country,
      language: extra.language,
      audioName: extra.audioName,
      nicheName: extra.nicheName,
      hashtags: [...(metadata?.hashtags ?? []), ...(extra.hashtags ?? [])],
      notes: extra.notes,
      isSample: extra.isSample,
    },
    { updateDuplicates: true }
  );
  return { ...result, metadataMessage: metadata?.message };
}

/** Recompute crossPlatformCount + scores for all items based on topic grouping. */
export async function recomputeCrossPlatform(groups: { itemIds: number[]; platforms: string[] }[]): Promise<void> {
  for (const g of groups) {
    const count = g.platforms.filter((p) => p !== 'google-trends').length || 1;
    for (const id of g.itemIds) {
      const item = await prisma.trendItem.findUnique({ where: { id } });
      if (!item || item.crossPlatformCount === count) continue;
      await prisma.trendItem.update({
        where: { id },
        data: {
          crossPlatformCount: count,
          ...scoreFields({ ...item, crossPlatformCount: count }),
        },
      });
    }
  }
}
