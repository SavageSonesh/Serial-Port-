// Transparent trend-scoring system (0–100).
// Weights: velocity 35%, engagement 25%, freshness 20%, cross-platform 10%, comments 10%.
// Logarithmic scaling keeps a single mega-creator from distorting everything.

export interface MetricsInput {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  publishedAt?: Date | string | null;
  crossPlatformCount?: number; // how many platforms this topic appears on (1–3+)
  now?: Date; // injectable for tests
}

export interface ScoreBreakdown {
  velocityScore: number;
  engagementScore: number;
  freshnessScore: number;
  crossPlatformScore: number;
  commentScore: number;
  weights: { velocity: number; engagement: number; freshness: number; crossPlatform: number; comments: number };
  inputs: {
    viewsPerHour: number | null;
    engagementRate: number | null;
    engagementEstimated: boolean;
    hoursSincePublished: number | null;
    crossPlatformCount: number;
    comments: number | null;
  };
}

export const WEIGHTS = {
  velocity: 0.35,
  engagement: 0.25,
  freshness: 0.2,
  crossPlatform: 0.1,
  comments: 0.1,
} as const;

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/** Hours since publication, minimum 0. Null when publish date is unknown. */
export function hoursSince(publishedAt?: Date | string | null, now: Date = new Date()): number | null {
  if (!publishedAt) return null;
  const pub = typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt;
  if (isNaN(pub.getTime())) return null;
  return Math.max(0, (now.getTime() - pub.getTime()) / 3_600_000);
}

/** views / max(hours since publication, 1). Null when views unknown. */
export function viewsPerHour(views?: number | null, publishedAt?: Date | string | null, now: Date = new Date()): number | null {
  if (views == null) return null;
  const h = hoursSince(publishedAt, now);
  // Unknown publish date: treat conservatively as 1 week old so old imports don't look explosive.
  const hours = h == null ? 168 : Math.max(h, 1);
  return views / hours;
}

/**
 * Engagement rate = ((likes + comments + shares) / views) * 100.
 * When shares are unavailable the result is computed from likes + comments
 * and flagged as estimated.
 */
export function engagementRate(m: {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
}): { rate: number | null; estimated: boolean } {
  const { views, likes, comments, shares } = m;
  if (views == null || views <= 0) return { rate: null, estimated: false };
  if (likes == null && comments == null && shares == null) return { rate: null, estimated: false };
  const estimated = shares == null;
  const total = (likes ?? 0) + (comments ?? 0) + (shares ?? 0);
  return { rate: (total / views) * 100, estimated };
}

/** Log-scaled velocity: 0 at 0 views/hour, 100 at ~100k views/hour. */
export function velocityScore(vph: number | null): number {
  if (vph == null || vph <= 0) return 0;
  return clamp((Math.log10(vph + 1) / 5) * 100);
}

/** Engagement score: a 12% engagement rate maps to 100. */
export function engagementScore(rate: number | null): number {
  if (rate == null || rate <= 0) return 0;
  return clamp((rate / 12) * 100);
}

/** Freshness decays exponentially with a ~72-hour half-life-ish curve; ~0 after a couple of weeks. */
export function freshnessScore(hours: number | null): number {
  if (hours == null) return 20; // unknown age: small neutral credit
  return clamp(100 * Math.exp(-hours / 72));
}

/** 1 platform → 25, 2 → 62.5, 3+ → 100. */
export function crossPlatformScore(count: number): number {
  const c = Math.max(1, count || 1);
  return clamp(25 + (Math.min(c, 3) - 1) * 37.5);
}

/** Log-scaled comment activity: 100 at ~50k comments. */
export function commentScore(comments: number | null | undefined): number {
  if (comments == null || comments <= 0) return 0;
  return clamp((Math.log10(comments + 1) / Math.log10(50_000)) * 100);
}

export function computeTrendScore(input: MetricsInput): { score: number; breakdown: ScoreBreakdown } {
  const now = input.now ?? new Date();
  const hours = hoursSince(input.publishedAt, now);
  const vph = viewsPerHour(input.views, input.publishedAt, now);
  const eng = engagementRate(input);
  const cpc = Math.max(1, input.crossPlatformCount ?? 1);

  const breakdown: ScoreBreakdown = {
    velocityScore: round1(velocityScore(vph)),
    engagementScore: round1(engagementScore(eng.rate)),
    freshnessScore: round1(freshnessScore(hours)),
    crossPlatformScore: round1(crossPlatformScore(cpc)),
    commentScore: round1(commentScore(input.comments)),
    weights: {
      velocity: WEIGHTS.velocity,
      engagement: WEIGHTS.engagement,
      freshness: WEIGHTS.freshness,
      crossPlatform: WEIGHTS.crossPlatform,
      comments: WEIGHTS.comments,
    },
    inputs: {
      viewsPerHour: vph == null ? null : round1(vph),
      engagementRate: eng.rate == null ? null : round1(eng.rate),
      engagementEstimated: eng.estimated,
      hoursSincePublished: hours == null ? null : round1(hours),
      crossPlatformCount: cpc,
      comments: input.comments ?? null,
    },
  };

  const score =
    breakdown.velocityScore * WEIGHTS.velocity +
    breakdown.engagementScore * WEIGHTS.engagement +
    breakdown.freshnessScore * WEIGHTS.freshness +
    breakdown.crossPlatformScore * WEIGHTS.crossPlatform +
    breakdown.commentScore * WEIGHTS.comments;

  return { score: round1(clamp(score)), breakdown };
}

export type TrendLabel = 'Low activity' | 'Growing' | 'Trending' | 'Viral' | 'Breakout';

export function trendLabel(score: number): TrendLabel {
  if (score >= 85) return 'Breakout';
  if (score >= 70) return 'Viral';
  if (score >= 50) return 'Trending';
  if (score >= 25) return 'Growing';
  return 'Low activity';
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
