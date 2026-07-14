// YouTube connector.
// Without an API key: free public oEmbed endpoint (title, author, thumbnail — no stats).
// With a free YouTube Data API v3 key: full statistics, publish date, and search.

import { env } from '../env.js';
import { logger } from '../logger.js';

export interface FetchedMetadata {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  creatorHandle?: string;
  creatorName?: string;
  views?: number;
  likes?: number;
  comments?: number;
  publishedAt?: string;
  hashtags?: string[];
  source: string; // which method produced the data
  partial: boolean; // true when stats are missing
  message?: string; // user-facing explanation
}

const FETCH_TIMEOUT_MS = 12_000;

export async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function fetchYouTubeMetadata(videoId: string): Promise<FetchedMetadata> {
  // Prefer the Data API when a key is configured.
  if (env.youtubeApiKey) {
    try {
      const api = new URL('https://www.googleapis.com/youtube/v3/videos');
      api.searchParams.set('part', 'snippet,statistics');
      api.searchParams.set('id', videoId);
      api.searchParams.set('key', env.youtubeApiKey);
      const res = await fetchWithTimeout(api.toString());
      if (res.status === 403 || res.status === 429) {
        logger.warn('YouTube API quota/permission issue', { status: res.status });
        return oembedFallback(videoId, 'YouTube API quota exceeded or key invalid — fell back to basic metadata.');
      }
      if (!res.ok) throw new Error(`YouTube API returned ${res.status}`);
      const data = (await res.json()) as {
        items?: {
          snippet?: {
            title?: string;
            description?: string;
            publishedAt?: string;
            channelTitle?: string;
            tags?: string[];
            thumbnails?: Record<string, { url?: string }>;
          };
          statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
        }[];
      };
      const item = data.items?.[0];
      if (!item) {
        return {
          source: 'youtube-api',
          partial: true,
          message: 'Video not found via the YouTube API (it may be private or deleted). You can still enter data manually.',
        };
      }
      const sn = item.snippet ?? {};
      const st = item.statistics ?? {};
      const thumb = sn.thumbnails?.maxres?.url ?? sn.thumbnails?.high?.url ?? sn.thumbnails?.medium?.url ?? sn.thumbnails?.default?.url;
      return {
        title: sn.title,
        description: sn.description,
        thumbnailUrl: thumb,
        creatorName: sn.channelTitle,
        creatorHandle: sn.channelTitle,
        views: st.viewCount != null ? Number(st.viewCount) : undefined,
        likes: st.likeCount != null ? Number(st.likeCount) : undefined,
        comments: st.commentCount != null ? Number(st.commentCount) : undefined,
        publishedAt: sn.publishedAt,
        hashtags: sn.tags?.slice(0, 15),
        source: 'youtube-api',
        partial: false,
      };
    } catch (err) {
      logger.warn('YouTube API failed, falling back to oEmbed', { error: String(err) });
      return oembedFallback(videoId, 'YouTube API request failed — fell back to basic public metadata.');
    }
  }
  return oembedFallback(
    videoId,
    'No YouTube API key configured. Title/author/thumbnail were fetched from the free oEmbed endpoint; view/like/comment counts must be entered manually or add a free API key in .env.'
  );
}

async function oembedFallback(videoId: string, message: string): Promise<FetchedMetadata> {
  try {
    const res = await fetchWithTimeout(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    );
    if (!res.ok) throw new Error(`oEmbed returned ${res.status}`);
    const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
    return {
      title: data.title,
      creatorName: data.author_name,
      creatorHandle: data.author_name,
      thumbnailUrl: data.thumbnail_url,
      source: 'youtube-oembed',
      partial: true,
      message,
    };
  } catch (err) {
    logger.warn('YouTube oEmbed failed', { error: String(err) });
    return {
      source: 'youtube-oembed',
      partial: true,
      message: 'Could not reach YouTube automatically. Enter the details manually — nothing is lost.',
    };
  }
}

export interface YouTubeSearchResult {
  videoId: string;
  url: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl?: string;
}

/** Search requires an API key; returns a clear explanation when absent. */
export async function searchYouTube(
  query: string,
  opts: { regionCode?: string; maxResults?: number } = {}
): Promise<{ ok: boolean; results: YouTubeSearchResult[]; message?: string }> {
  if (!env.youtubeApiKey) {
    return {
      ok: false,
      results: [],
      message:
        'YouTube search needs a free YouTube Data API key (YOUTUBE_API_KEY in backend/.env). Without it you can still paste video URLs manually.',
    };
  }
  try {
    const api = new URL('https://www.googleapis.com/youtube/v3/search');
    api.searchParams.set('part', 'snippet');
    api.searchParams.set('type', 'video');
    api.searchParams.set('q', query);
    api.searchParams.set('order', 'viewCount');
    api.searchParams.set('maxResults', String(Math.min(opts.maxResults ?? 15, 25)));
    if (opts.regionCode && opts.regionCode !== 'WW') api.searchParams.set('regionCode', opts.regionCode);
    api.searchParams.set('key', env.youtubeApiKey);
    const res = await fetchWithTimeout(api.toString());
    if (res.status === 403 || res.status === 429) {
      return { ok: false, results: [], message: 'YouTube API quota exceeded — try again tomorrow or reduce searches.' };
    }
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> } }[];
    };
    const results = (data.items ?? [])
      .filter((i) => i.id?.videoId)
      .map((i) => ({
        videoId: i.id!.videoId!,
        url: `https://www.youtube.com/watch?v=${i.id!.videoId}`,
        title: i.snippet?.title ?? '(untitled)',
        channelTitle: i.snippet?.channelTitle ?? '',
        publishedAt: i.snippet?.publishedAt ?? '',
        thumbnailUrl: i.snippet?.thumbnails?.high?.url ?? i.snippet?.thumbnails?.default?.url,
      }));
    return { ok: true, results };
  } catch (err) {
    logger.warn('YouTube search failed', { error: String(err) });
    return { ok: false, results: [], message: `YouTube search failed: ${String(err)}` };
  }
}
