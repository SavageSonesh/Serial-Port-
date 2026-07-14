// TikTok connector.
// TikTok does not offer a free public API for view/like statistics.
// What IS freely available: the public oEmbed endpoint (title, author, thumbnail).
// We use only that. Metrics are entered manually or via CSV — the app never
// bypasses TikTok's protection systems, logins, CAPTCHAs, or rate limits.

import { logger } from '../logger.js';
import { fetchWithTimeout, type FetchedMetadata } from './youtube.js';

export const TIKTOK_LIMITATION_MESSAGE =
  'TikTok does not provide free public access to view/like/comment counts. ' +
  'Title, creator and thumbnail were fetched from TikTok’s public oEmbed endpoint where possible; ' +
  'enter the metrics manually (they are shown on the video page) or import them via CSV.';

export async function fetchTikTokMetadata(url: string): Promise<FetchedMetadata> {
  try {
    const res = await fetchWithTimeout(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (res.status === 400 || res.status === 404) {
      return {
        source: 'tiktok-oembed',
        partial: true,
        message: 'TikTok could not find this video via oEmbed (it may be private, region-locked, or removed). Enter the details manually.',
      };
    }
    if (res.status === 429) {
      return {
        source: 'tiktok-oembed',
        partial: true,
        message: 'TikTok rate-limited the metadata request. Wait a few minutes or enter the details manually.',
      };
    }
    if (!res.ok) throw new Error(`oEmbed returned ${res.status}`);
    const data = (await res.json()) as { title?: string; author_name?: string; author_unique_id?: string; thumbnail_url?: string };
    return {
      title: data.title,
      creatorName: data.author_name,
      creatorHandle: data.author_unique_id ?? data.author_name,
      thumbnailUrl: data.thumbnail_url,
      source: 'tiktok-oembed',
      partial: true, // oEmbed never includes metrics
      message: TIKTOK_LIMITATION_MESSAGE,
    };
  } catch (err) {
    logger.warn('TikTok oEmbed failed', { error: String(err) });
    return {
      source: 'tiktok-oembed',
      partial: true,
      message: 'Could not reach TikTok automatically (blocked or offline). Enter the details manually — nothing is lost.',
    };
  }
}
