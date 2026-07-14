// Template-based content-idea generator. Works fully offline with no AI.
// Combines category templates with keywords/hashtags/audio pulled from real trends.

export interface TrendContext {
  keywords: string[];
  hashtags: string[];
  audioNames: string[];
  niche?: string | null;
  platform?: string | null;
  topTitle?: string | null;
}

export interface GeneratedIdea {
  title: string;
  videoIdea: string;
  hook: string;
  caption: string;
  hashtags: string[];
  format: string;
  duration: string;
  visualStructure: string;
  callToAction: string;
  angle: string;
  rationale: string;
  category: string;
}

interface CategoryTemplate {
  id: string;
  name: string;
  subjects: string[];
  hooks: string[];
  formats: string[];
  durations: string[];
  structures: string[];
  ctas: string[];
  angles: string[];
  baseHashtags: string[];
}

export const CATEGORIES: CategoryTemplate[] = [
  {
    id: 'interesting-facts',
    name: 'Interesting facts',
    subjects: ['a fact almost nobody knows', 'a myth everyone believes', 'a record that sounds fake', 'a hidden detail in everyday life'],
    hooks: ['You’ve been lied to about {kw}…', 'Nobody talks about this {kw} fact.', '99% of people don’t know this about {kw}.', 'This {kw} fact sounds fake — it isn’t.'],
    formats: ['Talking head with bold captions', 'B-roll montage with voiceover', 'Text-on-screen countdown'],
    durations: ['20–35 seconds', '30–45 seconds'],
    structures: ['Hook (0–2s) → claim → 3 rapid proof points with B-roll → payoff twist → CTA', 'Cold open on the weirdest detail → context → reveal → CTA'],
    ctas: ['Follow for a new fact every day.', 'Comment the fact that surprised you most.', 'Send this to someone who needs to know.'],
    angles: ['Debunk a common misconception instead of just stating the fact', 'Frame the fact as a story with a twist ending'],
    baseHashtags: ['facts', 'didyouknow', 'interesting', 'learnontiktok'],
  },
  {
    id: 'animals',
    name: 'Animals',
    subjects: ['an animal with a bizarre superpower', 'the weirdest animal friendship', 'an animal behaviour scientists can’t fully explain'],
    hooks: ['This animal breaks the rules of nature…', 'Wait until you see what {kw} can do.', 'Nature really said: hold my coffee.'],
    formats: ['Voiceover over licensed/own animal footage', 'Reaction-style commentary', 'Fact stack with zoom cuts'],
    durations: ['25–40 seconds', '35–50 seconds'],
    structures: ['Shock visual → “here’s why” explanation → escalating facts → payoff → CTA', 'Question hook → 3 escalating clips → answer reveal'],
    ctas: ['Follow for daily animal facts.', 'Which animal should I cover next? Comment below.'],
    angles: ['Rank animals by an unexpected metric', 'Explain the science behind a viral animal clip'],
    baseHashtags: ['animals', 'animalfacts', 'wildlife', 'nature'],
  },
  {
    id: 'plants',
    name: 'Plants',
    subjects: ['a plant that behaves like an animal', 'the science of a common houseplant', 'a plant survival trick'],
    hooks: ['Your houseplant is smarter than you think.', 'This plant does something impossible.', 'Stop killing your {kw} — do this instead.'],
    formats: ['Close-up macro shots with voiceover', 'Before/after timelapse', 'Myth vs fact split screen'],
    durations: ['20–35 seconds', '30–45 seconds'],
    structures: ['Bold claim → macro visuals → explanation → practical tip → CTA'],
    ctas: ['Save this for your next plant.', 'Follow for plant science made simple.'],
    angles: ['Turn plant care into a “mistakes ranked” format', 'Explain one plant mechanism like a heist movie'],
    baseHashtags: ['plants', 'plantfacts', 'planttok', 'gardening'],
  },
  {
    id: 'couple-comedy',
    name: 'Couple comedy',
    subjects: ['the difference between how partners handle {kw}', 'an everyday argument exaggerated', 'expectation vs reality in relationships'],
    hooks: ['POV: your partner discovers {kw}.', 'Every couple knows this fight.', 'He/she said it was “just a quick stop”…'],
    formats: ['POV skit', 'Split-screen “him vs her”', 'Hidden-camera style bit'],
    durations: ['15–30 seconds', '25–40 seconds'],
    structures: ['Instant scenario setup → escalation ×3 → punchline in the last 2 seconds', 'Text-on-screen premise → acted scene → freeze-frame punchline'],
    ctas: ['Tag your partner.', 'Follow for part 2.', 'Which one are you? Comment below.'],
    angles: ['Swap the expected roles for the punchline', 'End on a wholesome twist instead of the obvious joke'],
    baseHashtags: ['couplecomedy', 'relatable', 'couplegoals', 'funnycouple'],
  },
  {
    id: 'couple-challenges',
    name: 'Couple challenges',
    subjects: ['a guessing game about each other', 'a cooking challenge with a twist', 'a “who knows me better” test'],
    hooks: ['We tried the {kw} challenge — it ended badly.', 'Loser has to {kw}. No mercy.', 'This challenge exposes every couple.'],
    formats: ['Challenge with on-screen scoreboard', 'Timed head-to-head', 'Blindfold twist challenge'],
    durations: ['30–60 seconds'],
    structures: ['Rules in 3 seconds → 3 rounds with escalating stakes → winner reveal → forfeit → CTA'],
    ctas: ['Try this with your partner and tag us.', 'What should the loser do next time? Comment ideas.'],
    angles: ['Add a forfeit voted by the comments', 'Invert a trending challenge with your own rule'],
    baseHashtags: ['couplechallenge', 'challenge', 'couples', 'trend'],
  },
  {
    id: 'food-challenges',
    name: 'Food challenges',
    subjects: ['rating a viral food hack', 'eating in reverse order', 'a blind taste test'],
    hooks: ['I tested the viral {kw} so you don’t have to.', 'This food hack has 50M views. It’s a lie.', 'Blind taste test — instant regret.'],
    formats: ['Test-and-react', 'Side-by-side comparison', 'Countdown ranking'],
    durations: ['30–60 seconds'],
    structures: ['Show the viral claim → attempt it live → honest reaction → verdict score → CTA'],
    ctas: ['What should I test next? Drop it in the comments.', 'Follow so you don’t miss the next test.'],
    angles: ['Be the honest reviewer in a sea of fake reactions', 'Add a strict scoring system viewers can argue with'],
    baseHashtags: ['foodchallenge', 'foodtok', 'tastetest', 'viralfood'],
  },
  {
    id: 'restaurant',
    name: 'Restaurant content',
    subjects: ['a hidden local restaurant', 'rating the cheapest vs most expensive dish', 'what staff actually eat'],
    hooks: ['This place has no sign — and a queue around the block.', 'I ordered the cheapest and the most expensive thing.', 'Locals didn’t want me to share this spot.'],
    formats: ['Mini food-vlog', 'Receipt-reveal rating', 'POV counter-to-table'],
    durations: ['30–60 seconds'],
    structures: ['Exterior tease → the order → first-bite reaction → price reveal → verdict → CTA'],
    ctas: ['Save this for your next visit.', 'Which city should I cover next?'],
    angles: ['Rate by “value per euro” instead of taste alone', 'Interview the owner for one sentence of history'],
    baseHashtags: ['foodreview', 'restaurant', 'hiddengem', 'foodie'],
  },
  {
    id: 'educational',
    name: 'Educational content',
    subjects: ['a concept explained in 30 seconds', 'a skill people think takes years', 'why something everyday works'],
    hooks: ['School never taught you {kw} like this.', 'Learn {kw} in 30 seconds.', 'You use this every day and don’t know how it works.'],
    formats: ['Whiteboard/graphics explainer', 'Talking head with cut-ins', 'Screen-recorded walkthrough'],
    durations: ['30–60 seconds'],
    structures: ['Question hook → simple analogy → 3-step explanation → recap card → CTA'],
    ctas: ['Follow to learn one thing a day.', 'Save this for later.'],
    angles: ['Explain with one unexpected everyday analogy', 'Start from the common wrong explanation and correct it'],
    baseHashtags: ['learn', 'education', 'explained', 'howitworks'],
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    subjects: ['a true story with a twist', 'the backstory of something famous', 'a decision that changed everything'],
    hooks: ['This story sounds made up. Every word is true.', 'In {kw}, one decision changed everything.', 'Nobody expected what happened next.'],
    formats: ['Narrated B-roll story', 'Part 1/Part 2 series', 'Map/graphic-assisted retelling'],
    durations: ['45–60 seconds'],
    structures: ['Start at the most dramatic moment → rewind to the beginning → build → resolve → reflection line → CTA'],
    ctas: ['Follow for part 2.', 'Would you have done the same? Comment.'],
    angles: ['Tell it from the least expected point of view', 'Withhold the reveal until the final second'],
    baseHashtags: ['storytime', 'truestory', 'history', 'story'],
  },
  {
    id: 'reactions',
    name: 'Reactions',
    subjects: ['reacting to a viral {kw} clip', 'an expert reacting to amateur attempts', 'first-time reaction to a classic'],
    hooks: ['I can’t believe this is real…', 'An actual expert reacts to viral {kw}.', 'Watch the moment it goes wrong.'],
    formats: ['Picture-in-picture reaction', 'Pause-and-explain breakdown', 'Duet/stitch style response'],
    durations: ['30–60 seconds'],
    structures: ['Clip tease → genuine reaction beat → expert insight → verdict → CTA'],
    ctas: ['Send me clips to react to.', 'Follow for honest takes.'],
    angles: ['Add real expertise, not just faces', 'React to the comments, not just the clip'],
    baseHashtags: ['reaction', 'react', 'viral', 'commentary'],
  },
  {
    id: 'viral-news',
    name: 'Viral news explanations',
    subjects: ['why {kw} is suddenly everywhere', 'the context behind a trending story', 'what a viral headline leaves out'],
    hooks: ['Here’s why everyone is talking about {kw}.', 'The {kw} story is missing one huge detail.', 'This blew up overnight — here’s the full context.'],
    formats: ['Fast-cut explainer with headlines', 'Timeline breakdown', 'Q&A card format'],
    durations: ['40–60 seconds'],
    structures: ['State the trend → what actually happened → the missing context → what happens next → CTA'],
    ctas: ['Follow to stay ahead of the trends.', 'What should I explain next?'],
    angles: ['Be the calm explainer while everyone else shouts', 'Focus on the one detail every other video skips'],
    baseHashtags: ['news', 'explained', 'trending', 'viral'],
  },
];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function fill(template: string, kw: string): string {
  return template.replace(/\{kw\}/g, kw);
}

/** Deterministic PRNG so tests can be stable when a seed is provided. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateIdeas(
  ctx: TrendContext,
  options: { categoryId?: string; count?: number; seed?: number } = {}
): GeneratedIdea[] {
  const count = Math.min(Math.max(options.count ?? 5, 1), 10);
  const rng = options.seed != null ? mulberry32(options.seed) : Math.random;
  const pool = options.categoryId ? CATEGORIES.filter((c) => c.id === options.categoryId) : CATEGORIES;
  const cats = pool.length > 0 ? pool : CATEGORIES;

  const keywords = ctx.keywords.length > 0 ? ctx.keywords : [ctx.niche ?? 'your niche'];
  const ideas: GeneratedIdea[] = [];

  for (let i = 0; i < count; i++) {
    const cat = cats[i % cats.length] ?? pick(cats, rng);
    const kw = keywords[i % keywords.length] ?? pick(keywords, rng);
    const subject = fill(pick(cat.subjects, rng), kw);
    const hook = fill(pick(cat.hooks, rng), kw);
    const format = pick(cat.formats, rng);
    const structure = pick(cat.structures, rng);
    const cta = pick(cat.ctas, rng);
    const angle = fill(pick(cat.angles, rng), kw);
    const audio = ctx.audioNames[i % Math.max(ctx.audioNames.length, 1)];

    const tags = [
      ...new Set([
        ...cat.baseHashtags,
        ...ctx.hashtags.slice(0, 4),
        ...kw.split(/\s+/).filter((w) => w.length > 3).slice(0, 2),
      ]),
    ].slice(0, 8);

    const title = `${capitalize(kw)}: ${subject}`;
    ideas.push({
      title,
      videoIdea: `A ${cat.name.toLowerCase()} piece about ${subject}, built around the trending keyword “${kw}”${
        ctx.niche ? ` in the ${ctx.niche} niche` : ''
      }.${audio ? ` Consider using trending audio “${audio}”.` : ''}`,
      hook,
      caption: `${hook} ${tags.slice(0, 3).map((t) => `#${t}`).join(' ')}`,
      hashtags: tags,
      format,
      duration: pick(cat.durations, rng),
      visualStructure: structure,
      callToAction: cta,
      angle,
      rationale: `“${kw}” is currently active in your collected trends${
        ctx.topTitle ? ` (e.g. “${ctx.topTitle}”)` : ''
      }. The ${cat.name.toLowerCase()} format has repeatable hooks, and this angle (${angle.toLowerCase()}) differentiates it from the videos already ranking.`,
      category: cat.name,
    });
  }
  return ideas;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
