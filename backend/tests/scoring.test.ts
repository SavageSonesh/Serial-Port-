import { describe, it, expect } from 'vitest';
import {
  computeTrendScore,
  engagementRate,
  viewsPerHour,
  trendLabel,
  velocityScore,
  freshnessScore,
  crossPlatformScore,
} from '../src/lib/scoring.js';

const NOW = new Date('2026-07-14T12:00:00Z');

describe('viewsPerHour', () => {
  it('divides views by hours since publication', () => {
    const published = new Date(NOW.getTime() - 10 * 3_600_000); // 10h ago
    expect(viewsPerHour(10_000, published, NOW)).toBeCloseTo(1000);
  });

  it('uses a minimum of 1 hour', () => {
    const published = new Date(NOW.getTime() - 10 * 60_000); // 10 minutes ago
    expect(viewsPerHour(5000, published, NOW)).toBeCloseTo(5000);
  });

  it('returns null when views are unknown', () => {
    expect(viewsPerHour(null, NOW, NOW)).toBeNull();
  });

  it('treats unknown publish dates conservatively (1 week)', () => {
    expect(viewsPerHour(1680, null, NOW)).toBeCloseTo(10);
  });
});

describe('engagementRate', () => {
  it('computes ((likes+comments+shares)/views)*100', () => {
    const { rate, estimated } = engagementRate({ views: 1000, likes: 80, comments: 15, shares: 5 });
    expect(rate).toBeCloseTo(10);
    expect(estimated).toBe(false);
  });

  it('marks the rate as estimated when shares are missing', () => {
    const { rate, estimated } = engagementRate({ views: 1000, likes: 80, comments: 20, shares: null });
    expect(rate).toBeCloseTo(10);
    expect(estimated).toBe(true);
  });

  it('returns null without views', () => {
    expect(engagementRate({ views: null, likes: 100 }).rate).toBeNull();
    expect(engagementRate({ views: 0, likes: 100 }).rate).toBeNull();
  });

  it('returns null when no interaction metric exists', () => {
    expect(engagementRate({ views: 1000 }).rate).toBeNull();
  });
});

describe('component scores', () => {
  it('velocity uses logarithmic scaling', () => {
    expect(velocityScore(null)).toBe(0);
    expect(velocityScore(100_000)).toBe(100);
    const mid = velocityScore(1000);
    expect(mid).toBeGreaterThan(50);
    expect(mid).toBeLessThan(70);
    // A 10x larger creator does not get a 10x larger score.
    expect(velocityScore(1_000_000)).toBe(100);
  });

  it('freshness decays with age', () => {
    expect(freshnessScore(0)).toBe(100);
    expect(freshnessScore(72)).toBeLessThan(40);
    expect(freshnessScore(1000)).toBeLessThan(1);
  });

  it('cross-platform rewards multi-platform topics', () => {
    expect(crossPlatformScore(1)).toBe(25);
    expect(crossPlatformScore(2)).toBe(62.5);
    expect(crossPlatformScore(3)).toBe(100);
    expect(crossPlatformScore(5)).toBe(100);
  });
});

describe('computeTrendScore', () => {
  it('applies the documented weights', () => {
    const { score, breakdown } = computeTrendScore({
      views: 1_000_000,
      likes: 100_000,
      comments: 5_000,
      shares: 10_000,
      publishedAt: new Date(NOW.getTime() - 24 * 3_600_000),
      crossPlatformCount: 2,
      now: NOW,
    });
    const expected =
      breakdown.velocityScore * 0.35 +
      breakdown.engagementScore * 0.25 +
      breakdown.freshnessScore * 0.2 +
      breakdown.crossPlatformScore * 0.1 +
      breakdown.commentScore * 0.1;
    expect(score).toBeCloseTo(Math.round(expected * 10) / 10, 1);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles completely missing metrics without crashing', () => {
    const { score, breakdown } = computeTrendScore({});
    expect(score).toBeGreaterThanOrEqual(0);
    expect(breakdown.inputs.engagementRate).toBeNull();
  });

  it('exposes the breakdown for the score tooltip', () => {
    const { breakdown } = computeTrendScore({ views: 5000, likes: 400, publishedAt: NOW, now: NOW });
    expect(breakdown.weights.velocity).toBe(0.35);
    expect(breakdown.inputs.engagementEstimated).toBe(true);
  });
});

describe('trendLabel', () => {
  it('maps score ranges to labels', () => {
    expect(trendLabel(10)).toBe('Low activity');
    expect(trendLabel(24)).toBe('Low activity');
    expect(trendLabel(25)).toBe('Growing');
    expect(trendLabel(49)).toBe('Growing');
    expect(trendLabel(50)).toBe('Trending');
    expect(trendLabel(69)).toBe('Trending');
    expect(trendLabel(70)).toBe('Viral');
    expect(trendLabel(84)).toBe('Viral');
    expect(trendLabel(85)).toBe('Breakout');
    expect(trendLabel(100)).toBe('Breakout');
  });
});
