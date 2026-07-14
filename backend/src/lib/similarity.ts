// Local text-similarity system: tokenization + keyword/hashtag/audio overlap.
// No paid embeddings — pure lexical matching, good enough for grouping
// cross-platform topics.

const STOPWORDS = new Set(
  (
    'a an the and or but of to in on at for with from by is are was were be been this that these those it its ' +
    'i you he she we they my your our their me him her us them as if so not no do does did done have has had ' +
    'will would can could should just very really about into over under out up down how what when where why ' +
    'who which am pt en es de la el les los las un una y o que www http https com video shorts watch reel'
  ).split(/\s+/)
);

export function tokenize(text?: string | null): string[] {
  if (!text) return [];
  return (
    text
      .toLowerCase()
      // keep letters/numbers across scripts; split everything else
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

export interface SimilarityDoc {
  id: number;
  platformId: string;
  title?: string | null;
  description?: string | null;
  hashtags?: string[];
  audioName?: string | null;
  publishedAt?: Date | string | null;
}

interface Profile {
  id: number;
  platformId: string;
  tokens: Set<string>;
  hashtags: Set<string>;
  audio: string | null;
  publishedAt: number | null;
}

function profile(d: SimilarityDoc): Profile {
  const tokens = new Set([...tokenize(d.title), ...tokenize(d.description)]);
  const hashtags = new Set((d.hashtags ?? []).map((h) => h.toLowerCase()));
  for (const h of hashtags) tokens.add(h);
  const pub = d.publishedAt ? new Date(d.publishedAt).getTime() : NaN;
  return {
    id: d.id,
    platformId: d.platformId,
    tokens,
    hashtags,
    audio: d.audioName ? d.audioName.toLowerCase().trim() : null,
    publishedAt: isNaN(pub) ? null : pub,
  };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Pairwise similarity in [0, 1] combining keywords, hashtags, audio and publish-date proximity. */
export function similarity(a: SimilarityDoc, b: SimilarityDoc): number {
  return similarityProfiles(profile(a), profile(b));
}

function similarityProfiles(pa: Profile, pb: Profile): number {
  const kw = jaccard(pa.tokens, pb.tokens);
  const ht = jaccard(pa.hashtags, pb.hashtags);
  const audio = pa.audio && pb.audio && pa.audio === pb.audio ? 1 : 0;
  let dateBoost = 0;
  if (pa.publishedAt != null && pb.publishedAt != null) {
    const daysApart = Math.abs(pa.publishedAt - pb.publishedAt) / 86_400_000;
    if (daysApart <= 7) dateBoost = 1 - daysApart / 7;
  }
  // Keywords dominate; hashtags reinforce; shared audio is a strong signal.
  return Math.min(1, kw * 0.55 + ht * 0.25 + audio * 0.15 + dateBoost * 0.05);
}

export interface TopicGroup {
  itemIds: number[];
  platforms: string[];
  label: string;
  sharedKeywords: string[];
}

/** Greedy single-link clustering over the similarity threshold. */
export function groupByTopic(docs: SimilarityDoc[], threshold = 0.22): TopicGroup[] {
  const profiles = docs.map(profile);
  const parent = profiles.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      if (similarityProfiles(profiles[i], profiles[j]) >= threshold) union(i, j);
    }
  }

  const clusters = new Map<number, number[]>();
  profiles.forEach((_, i) => {
    const root = find(i);
    const arr = clusters.get(root) ?? [];
    arr.push(i);
    clusters.set(root, arr);
  });

  const groups: TopicGroup[] = [];
  for (const members of clusters.values()) {
    const platforms = [...new Set(members.map((i) => profiles[i].platformId))].sort();
    // Shared keywords = tokens appearing in at least half the members (min 2)
    const counts = new Map<string, number>();
    for (const i of members) {
      for (const t of profiles[i].tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const need = Math.max(2, Math.ceil(members.length / 2));
    const shared = [...counts.entries()]
      .filter(([, c]) => (members.length === 1 ? true : c >= need))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);

    groups.push({
      itemIds: members.map((i) => profiles[i].id),
      platforms,
      label: platformLabel(platforms),
      sharedKeywords: shared,
    });
  }
  // Multi-platform groups first, then larger groups
  return groups.sort((a, b) => b.platforms.length - a.platforms.length || b.itemIds.length - a.itemIds.length);
}

export function platformLabel(platforms: string[]): string {
  const social = platforms.filter((p) => p !== 'google-trends');
  const names: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' };
  if (social.length >= 3) return 'Appearing on all three platforms';
  if (social.length === 2) return 'Appearing on two platforms';
  if (social.length === 1) return `${names[social[0]] ?? social[0]} only`;
  return 'Google Trends only';
}
