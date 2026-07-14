// Platform detection and URL normalization for duplicate detection.

export type PlatformId = 'tiktok' | 'instagram' | 'youtube' | 'google-trends';

export interface DetectedUrl {
  platformId: PlatformId;
  format: 'short-video' | 'reel' | 'video' | 'image' | 'other';
  /** Canonical key used for duplicate detection (stable across URL variants). */
  urlKey: string;
  /** Cleaned URL for storage/opening. */
  cleanUrl: string;
  /** Platform-native content id when derivable. */
  contentId?: string;
  /** Creator handle when present in the URL. */
  handle?: string;
}

function tryParse(raw: string): URL | null {
  const candidate = raw.trim();
  if (!candidate) return null;
  try {
    return new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
  } catch {
    return null;
  }
}

export function detectPlatform(rawUrl: string): DetectedUrl | null {
  const url = tryParse(rawUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const path = url.pathname.replace(/\/+$/, '');

  // --- YouTube ---
  if (host === 'youtu.be') {
    const id = path.split('/').filter(Boolean)[0];
    if (!id) return null;
    return yt(id, 'video');
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'shorts' && parts[1]) return yt(parts[1], 'short-video');
    if (parts[0] === 'watch' || path === '' || path === '/watch') {
      const id = url.searchParams.get('v');
      if (id) return yt(id, 'video');
    }
    if (parts[0] === 'embed' && parts[1]) return yt(parts[1], 'video');
    return null;
  }

  // --- TikTok ---
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const parts = path.split('/').filter(Boolean);
    // https://www.tiktok.com/@user/video/1234567890
    if (parts.length >= 3 && parts[0].startsWith('@') && (parts[1] === 'video' || parts[1] === 'photo')) {
      const id = parts[2];
      return {
        platformId: 'tiktok',
        format: parts[1] === 'photo' ? 'image' : 'short-video',
        urlKey: `tiktok:${id}`,
        cleanUrl: `https://www.tiktok.com/${parts[0]}/${parts[1]}/${id}`,
        contentId: id,
        handle: parts[0].slice(1),
      };
    }
    // Short links (vm.tiktok.com/xyz, tiktok.com/t/xyz) can't be resolved without a request.
    if ((host === 'vm.tiktok.com' || parts[0] === 't') && parts.length >= 1) {
      const id = host === 'vm.tiktok.com' ? parts[0] : parts[1];
      if (id) {
        return {
          platformId: 'tiktok',
          format: 'short-video',
          urlKey: `tiktok:short:${id}`,
          cleanUrl: url.origin + url.pathname,
          contentId: id,
        };
      }
    }
    return null;
  }
  if (host === 'vm.tiktok.com') {
    const id = path.split('/').filter(Boolean)[0];
    if (!id) return null;
    return {
      platformId: 'tiktok',
      format: 'short-video',
      urlKey: `tiktok:short:${id}`,
      cleanUrl: `https://vm.tiktok.com/${id}`,
      contentId: id,
    };
  }

  // --- Instagram ---
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    const parts = path.split('/').filter(Boolean);
    const kinds: Record<string, DetectedUrl['format']> = { reel: 'reel', reels: 'reel', p: 'image', tv: 'video' };
    // /reel/{code} or /{user}/reel/{code}
    for (let i = 0; i < parts.length - 1; i++) {
      const kind = kinds[parts[i]];
      if (kind && parts[i + 1]) {
        const code = parts[i + 1];
        return {
          platformId: 'instagram',
          format: kind,
          urlKey: `instagram:${code}`,
          cleanUrl: `https://www.instagram.com/${parts[i] === 'reels' ? 'reel' : parts[i]}/${code}/`,
          contentId: code,
          handle: i > 0 ? parts[0] : undefined,
        };
      }
    }
    return null;
  }

  // --- Google Trends ---
  if (host === 'trends.google.com') {
    return {
      platformId: 'google-trends',
      format: 'other',
      urlKey: `google-trends:${url.pathname}${url.search}`,
      cleanUrl: url.toString(),
    };
  }

  return null;

  function yt(id: string, format: 'video' | 'short-video'): DetectedUrl {
    return {
      platformId: 'youtube',
      format,
      urlKey: `youtube:${id}`,
      cleanUrl: format === 'short-video' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      contentId: id,
    };
  }
}

/** Extract #hashtags from free text. */
export function extractHashtags(text?: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return [...new Set(matches.map((h) => h.slice(1).toLowerCase()))];
}
