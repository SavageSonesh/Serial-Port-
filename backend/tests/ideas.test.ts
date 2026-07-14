import { describe, it, expect } from 'vitest';
import { generateIdeas, CATEGORIES } from '../src/lib/ideas.js';

describe('generateIdeas (template generator, no AI needed)', () => {
  const ctx = {
    keywords: ['octopus facts', 'deep sea'],
    hashtags: ['animalfacts', 'ocean'],
    audioNames: ['calm waves beat'],
    niche: 'Animal facts',
    topTitle: 'Insane deep sea animal facts',
  };

  it('generates the requested number of complete ideas', () => {
    const ideas = generateIdeas(ctx, { count: 5, seed: 42 });
    expect(ideas).toHaveLength(5);
    for (const idea of ideas) {
      expect(idea.title.length).toBeGreaterThan(3);
      expect(idea.hook.length).toBeGreaterThan(3);
      expect(idea.caption.length).toBeGreaterThan(3);
      expect(idea.hashtags.length).toBeGreaterThan(0);
      expect(idea.format.length).toBeGreaterThan(0);
      expect(idea.duration.length).toBeGreaterThan(0);
      expect(idea.visualStructure.length).toBeGreaterThan(0);
      expect(idea.callToAction.length).toBeGreaterThan(0);
      expect(idea.angle.length).toBeGreaterThan(0);
      expect(idea.rationale.length).toBeGreaterThan(0);
    }
  });

  it('respects the category filter', () => {
    const ideas = generateIdeas(ctx, { categoryId: 'animals', count: 3, seed: 1 });
    expect(ideas.every((i) => i.category === 'Animals')).toBe(true);
  });

  it('weaves trend keywords into the output', () => {
    const ideas = generateIdeas(ctx, { count: 2, seed: 7 });
    expect(ideas.some((i) => i.videoIdea.includes('octopus facts') || i.title.toLowerCase().includes('octopus'))).toBe(true);
  });

  it('works with an empty context (falls back to niche placeholder)', () => {
    const ideas = generateIdeas({ keywords: [], hashtags: [], audioNames: [] }, { count: 1, seed: 3 });
    expect(ideas).toHaveLength(1);
  });

  it('covers the required content categories', () => {
    const names = CATEGORIES.map((c) => c.name);
    for (const required of ['Interesting facts', 'Animals', 'Plants', 'Couple comedy', 'Couple challenges', 'Food challenges', 'Restaurant content', 'Educational content', 'Storytelling', 'Reactions', 'Viral news explanations']) {
      expect(names).toContain(required);
    }
  });
});
