// Google Trends connector using the free, unofficial `google-trends-api` package.
// Unofficial endpoints break or rate-limit from time to time — every call is
// wrapped so a failure returns a clear message instead of crashing the app.

import { logger } from '../logger.js';

// The package has no TypeScript types.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import googleTrends from 'google-trends-api';

export interface TrendsPoint {
  time: string;
  value: number;
}

export interface TrendsResult {
  ok: boolean;
  keyword: string;
  interestOverTime: TrendsPoint[];
  relatedQueries: { query: string; value: string }[];
  message?: string;
}

const COUNTRY_GEO: Record<string, string> = {
  Portugal: 'PT',
  India: 'IN',
  Nepal: 'NP',
  'United Kingdom': 'GB',
  'United States': 'US',
  Worldwide: '',
};

export function countryToGeo(country?: string | null): string {
  if (!country) return '';
  if (COUNTRY_GEO[country] !== undefined) return COUNTRY_GEO[country];
  return country.length === 2 ? country.toUpperCase() : '';
}

function timeRangeToStart(range?: string): Date {
  const now = Date.now();
  const day = 86_400_000;
  switch (range) {
    case '1d': return new Date(now - day);
    case '7d': return new Date(now - 7 * day);
    case '90d': return new Date(now - 90 * day);
    case '12m': return new Date(now - 365 * day);
    case '30d':
    default: return new Date(now - 30 * day);
  }
}

export async function fetchGoogleTrends(opts: {
  keyword: string;
  country?: string;
  timeRange?: string;
  category?: number;
}): Promise<TrendsResult> {
  const geo = countryToGeo(opts.country);
  const startTime = timeRangeToStart(opts.timeRange);
  const base = { keyword: opts.keyword, startTime, ...(geo ? { geo } : {}), ...(opts.category ? { category: opts.category } : {}) };

  const result: TrendsResult = { ok: false, keyword: opts.keyword, interestOverTime: [], relatedQueries: [] };

  try {
    const raw: string = await withTimeout(googleTrends.interestOverTime(base), 15_000);
    const parsed = JSON.parse(raw) as {
      default?: { timelineData?: { formattedTime?: string; value?: number[] }[] };
    };
    result.interestOverTime = (parsed.default?.timelineData ?? []).map((p) => ({
      time: p.formattedTime ?? '',
      value: p.value?.[0] ?? 0,
    }));
    result.ok = true;
  } catch (err) {
    logger.warn('Google Trends interestOverTime failed', { error: String(err) });
    result.message = friendlyTrendsError(err);
    return result;
  }

  try {
    const rawRelated: string = await withTimeout(googleTrends.relatedQueries(base), 15_000);
    const parsedRelated = JSON.parse(rawRelated) as {
      default?: { rankedList?: { rankedKeyword?: { query?: string; formattedValue?: string }[] }[] };
    };
    const ranked = parsedRelated.default?.rankedList ?? [];
    result.relatedQueries = ranked
      .flatMap((l) => l.rankedKeyword ?? [])
      .slice(0, 20)
      .map((k) => ({ query: k.query ?? '', value: k.formattedValue ?? '' }));
  } catch (err) {
    // Related queries failing is non-fatal — keep interest data.
    logger.warn('Google Trends relatedQueries failed', { error: String(err) });
  }

  return result;
}

function friendlyTrendsError(err: unknown): string {
  const s = String(err);
  if (s.includes('429') || s.toLowerCase().includes('rate')) {
    return 'Google Trends rate-limited the request. This is normal for the unofficial endpoint — wait a few minutes and try again.';
  }
  if (s.includes('timed out') || s.includes('abort')) {
    return 'Google Trends did not respond in time. Try again shortly.';
  }
  return `Google Trends request failed (the unofficial endpoint changes occasionally): ${s.slice(0, 200)}`;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ]);
}
