import { describe, it, expect } from 'vitest';
import { detectPlatform, extractHashtags } from '../src/lib/platform.js';

describe('detectPlatform', () => {
  it('detects TikTok video URLs and extracts the handle', () => {
    const d = detectPlatform('https://www.tiktok.com/@wildworld/video/7301234567890123456');
    expect(d?.platformId).toBe('tiktok');
    expect(d?.format).toBe('short-video');
    expect(d?.contentId).toBe('7301234567890123456');
    expect(d?.handle).toBe('wildworld');
  });

  it('normalizes TikTok URL variants to the same urlKey', () => {
    const a = detectPlatform('https://www.tiktok.com/@user/video/123?is_from_webapp=1');
    const b = detectPlatform('http://m.tiktok.com/@user/video/123/');
    expect(a?.urlKey).toBe(b?.urlKey);
  });

  it('detects Instagram reels', () => {
    const d = detectPlatform('https://www.instagram.com/reel/Cxyz123AbCd/');
    expect(d?.platformId).toBe('instagram');
    expect(d?.format).toBe('reel');
    expect(d?.contentId).toBe('Cxyz123AbCd');
  });

  it('detects Instagram posts under a username path', () => {
    const d = detectPlatform('https://www.instagram.com/someuser/reel/Cabc999/');
    expect(d?.platformId).toBe('instagram');
    expect(d?.handle).toBe('someuser');
  });

  it('detects YouTube Shorts', () => {
    const d = detectPlatform('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    expect(d?.platformId).toBe('youtube');
    expect(d?.format).toBe('short-video');
    expect(d?.contentId).toBe('dQw4w9WgXcQ');
  });

  it('normalizes youtu.be and watch URLs to the same key', () => {
    const a = detectPlatform('https://youtu.be/dQw4w9WgXcQ');
    const b = detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42');
    expect(a?.urlKey).toBe('youtube:dQw4w9WgXcQ');
    expect(a?.urlKey).toBe(b?.urlKey);
  });

  it('a Short and a watch URL of the same video share a urlKey', () => {
    const a = detectPlatform('https://www.youtube.com/shorts/abc123XYZ_-');
    const b = detectPlatform('https://www.youtube.com/watch?v=abc123XYZ_-');
    expect(a?.urlKey).toBe(b?.urlKey);
  });

  it('detects Google Trends URLs', () => {
    expect(detectPlatform('https://trends.google.com/trends/explore?q=ai')?.platformId).toBe('google-trends');
  });

  it('accepts URLs without a scheme', () => {
    expect(detectPlatform('www.tiktok.com/@x/video/999')?.platformId).toBe('tiktok');
  });

  it('rejects unrelated URLs', () => {
    expect(detectPlatform('https://example.com/watch?v=abc')).toBeNull();
    expect(detectPlatform('not a url at all')).toBeNull();
    expect(detectPlatform('')).toBeNull();
  });
});

describe('extractHashtags', () => {
  it('extracts unique lowercase hashtags', () => {
    expect(extractHashtags('Wow #Animals are #cool #ANIMALS')).toEqual(['animals', 'cool']);
  });
  it('supports unicode hashtags', () => {
    expect(extractHashtags('#café #日本')).toEqual(['café', '日本']);
  });
  it('returns empty for missing text', () => {
    expect(extractHashtags(null)).toEqual([]);
  });
});
