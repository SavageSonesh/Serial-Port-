import { describe, it, expect } from 'vitest';
import { tokenize, similarity, groupByTopic, platformLabel } from '../src/lib/similarity.js';

describe('tokenize', () => {
  it('lowercases, strips stopwords and short tokens', () => {
    expect(tokenize('The QUICK brown fox is in a box')).toEqual(['quick', 'brown', 'fox', 'box']);
  });
});

describe('similarity', () => {
  it('scores near-identical topics high', () => {
    const a = { id: 1, platformId: 'tiktok', title: 'Amazing animal facts about octopus intelligence', hashtags: ['animalfacts'] };
    const b = { id: 2, platformId: 'youtube', title: 'Octopus intelligence: amazing animal facts', hashtags: ['animalfacts'] };
    expect(similarity(a, b)).toBeGreaterThan(0.4);
  });

  it('scores unrelated topics low', () => {
    const a = { id: 1, platformId: 'tiktok', title: 'Couple cooking challenge disaster' };
    const b = { id: 2, platformId: 'youtube', title: 'Stock market crash explained simply' };
    expect(similarity(a, b)).toBeLessThan(0.1);
  });
});

describe('groupByTopic', () => {
  it('groups the same topic across platforms', () => {
    const docs = [
      { id: 1, platformId: 'tiktok', title: 'Insane animal facts about deep sea creatures', hashtags: ['animalfacts', 'ocean'] },
      { id: 2, platformId: 'youtube', title: 'Deep sea creatures — animal facts that sound fake', hashtags: ['animalfacts'] },
      { id: 3, platformId: 'instagram', title: 'Couple challenge blindfold taste test', hashtags: ['couplechallenge'] },
    ];
    const groups = groupByTopic(docs);
    const multi = groups.find((g) => g.itemIds.includes(1));
    expect(multi?.itemIds.sort()).toEqual([1, 2]);
    expect(multi?.platforms).toEqual(['tiktok', 'youtube']);
    expect(multi?.label).toBe('Appearing on two platforms');
  });
});

describe('platformLabel', () => {
  it('produces the required labels', () => {
    expect(platformLabel(['tiktok'])).toBe('TikTok only');
    expect(platformLabel(['youtube'])).toBe('YouTube only');
    expect(platformLabel(['instagram'])).toBe('Instagram only');
    expect(platformLabel(['tiktok', 'youtube'])).toBe('Appearing on two platforms');
    expect(platformLabel(['tiktok', 'youtube', 'instagram'])).toBe('Appearing on all three platforms');
  });
});
