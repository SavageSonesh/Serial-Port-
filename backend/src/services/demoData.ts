// Clearly-labelled sample data for testing the interface.
// Every record is marked isSample=true, titled with "[SAMPLE]", and described as
// "Sample data — not live platform data." — it is never presented as real.

import { prisma } from '../prisma.js';
import { upsertTrendItem } from './trendService.js';

const SAMPLE_NOTE = 'Sample data — not live platform data.';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

const SAMPLE_TRENDS = [
  {
    platformId: 'tiktok', title: '[SAMPLE] 5 animal facts that sound completely fake #animalfacts #wildlife',
    creatorHandle: 'sample.wildworld', views: 2_400_000, likes: 310_000, comments: 8_400, shares: 45_000,
    followerCount: 890_000, publishedAt: hoursAgo(18), format: 'short-video', country: 'United States', language: 'en',
    nicheName: 'Animal facts', audioName: 'original sound - wildworld', hashtags: ['animalfacts', 'wildlife', 'fyp'],
  },
  {
    platformId: 'youtube', title: '[SAMPLE] Animal Facts You Won\'t Believe Are Real #shorts',
    creatorHandle: 'SampleNatureHub', views: 1_150_000, likes: 96_000, comments: 3_100, shares: null,
    followerCount: 420_000, publishedAt: hoursAgo(30), format: 'short-video', country: 'United Kingdom', language: 'en',
    nicheName: 'Animal facts', audioName: null, hashtags: ['shorts', 'animalfacts', 'nature'],
  },
  {
    platformId: 'instagram', title: '[SAMPLE] These animal facts broke my brain 🧠 #animalfacts',
    creatorHandle: 'sample.factreel', views: 780_000, likes: 91_000, comments: 2_050, shares: 12_300,
    followerCount: 260_000, publishedAt: hoursAgo(26), format: 'reel', country: 'Portugal', language: 'en',
    nicheName: 'Animal facts', audioName: 'trending sound - facts edit', hashtags: ['animalfacts', 'reels', 'facts'],
  },
  {
    platformId: 'tiktok', title: '[SAMPLE] Couple cooking challenge gone WRONG 😂 #couplechallenge',
    creatorHandle: 'sample.us2', views: 5_600_000, likes: 720_000, comments: 15_800, shares: 98_000,
    followerCount: 1_500_000, publishedAt: hoursAgo(40), format: 'short-video', country: 'United States', language: 'en',
    nicheName: 'Couple comedy', audioName: 'Funny Kitchen Beat', hashtags: ['couplechallenge', 'couplecomedy', 'cooking'],
  },
  {
    platformId: 'instagram', title: '[SAMPLE] We tried the viral couple challenge… divorce pending 😅',
    creatorHandle: 'sample.duolife', views: 950_000, likes: 84_000, comments: 4_600, shares: null,
    followerCount: 380_000, publishedAt: hoursAgo(55), format: 'reel', country: 'India', language: 'en',
    nicheName: 'Couple comedy', audioName: 'Funny Kitchen Beat', hashtags: ['couplechallenge', 'couplegoals'],
  },
  {
    platformId: 'youtube', title: '[SAMPLE] Rating Lisbon\'s cheapest vs most expensive pastel de nata',
    creatorHandle: 'SampleFoodMaps', views: 430_000, likes: 31_000, comments: 1_900, shares: null,
    followerCount: 150_000, publishedAt: hoursAgo(70), format: 'short-video', country: 'Portugal', language: 'en',
    nicheName: 'Restaurant content', audioName: null, hashtags: ['lisbon', 'foodreview', 'portugal'],
  },
  {
    platformId: 'tiktok', title: '[SAMPLE] Hidden restaurant in Lisbon locals don\'t share 🤫 #lisbonfood',
    creatorHandle: 'sample.eatpt', views: 1_800_000, likes: 240_000, comments: 6_700, shares: 33_000,
    followerCount: 95_000, publishedAt: hoursAgo(12), format: 'short-video', country: 'Portugal', language: 'pt',
    nicheName: 'Restaurant content', audioName: 'som original - eatpt', hashtags: ['lisbonfood', 'hiddengem', 'portugal'],
  },
  {
    platformId: 'youtube', title: '[SAMPLE] How AI actually works — explained in 45 seconds #shorts',
    creatorHandle: 'SampleExplains', views: 3_200_000, likes: 280_000, comments: 9_200, shares: null,
    followerCount: 2_100_000, publishedAt: hoursAgo(90), format: 'short-video', country: 'India', language: 'en',
    nicheName: 'Artificial intelligence', audioName: null, hashtags: ['ai', 'shorts', 'explained', 'technology'],
  },
  {
    platformId: 'instagram', title: '[SAMPLE] Plants that move — timelapse proof 🌱 #planttok',
    creatorHandle: 'sample.greenlab', views: 310_000, likes: 42_000, comments: 890, shares: 5_100,
    followerCount: 72_000, publishedAt: hoursAgo(8), format: 'reel', country: 'United Kingdom', language: 'en',
    nicheName: 'Plant facts', audioName: 'calm garden beat', hashtags: ['planttok', 'plants', 'timelapse'],
  },
  {
    platformId: 'tiktok', title: '[SAMPLE] Nepal travel guide nobody gives you #nepal #travel',
    creatorHandle: 'sample.roam', views: 640_000, likes: 88_000, comments: 2_300, shares: 14_500,
    followerCount: 210_000, publishedAt: hoursAgo(120), format: 'short-video', country: 'Nepal', language: 'en',
    nicheName: 'Travel', audioName: 'himalaya lofi', hashtags: ['nepal', 'travel', 'kathmandu'],
  },
];

const SAMPLE_IDEAS = [
  {
    title: '[SAMPLE] "Animals that cheat at nature" — 3-part facts series',
    hook: 'This animal breaks the rules of nature…',
    category: 'Animals', status: 'idea', priority: 'high', intendedPlatform: 'tiktok',
    hashtags: 'animalfacts wildlife fyp', format: 'Voiceover + B-roll', duration: '30–40 seconds',
    notes: SAMPLE_NOTE,
  },
  {
    title: '[SAMPLE] Couple blind-taste challenge with a forfeit voted by comments',
    hook: 'Loser eats whatever the comments choose. No mercy.',
    category: 'Couple challenges', status: 'script-ready', priority: 'medium', intendedPlatform: 'instagram',
    hashtags: 'couplechallenge tastetest', format: 'Challenge with scoreboard', duration: '45–60 seconds',
    notes: SAMPLE_NOTE,
  },
  {
    title: '[SAMPLE] "Lisbon under €5" hidden food spots mini-series',
    hook: 'This place has no sign — and a queue around the block.',
    category: 'Restaurant content', status: 'researching', priority: 'high', intendedPlatform: 'youtube',
    hashtags: 'lisbon foodie hiddengem', format: 'Mini food-vlog', duration: '50–60 seconds',
    notes: SAMPLE_NOTE,
  },
];

export async function seedDemoData(): Promise<{ ok: boolean; trends: number; ideas: number; message: string }> {
  let trends = 0;
  for (const t of SAMPLE_TRENDS) {
    const r = await upsertTrendItem(
      { ...t, notes: SAMPLE_NOTE, isSample: true, url: null },
      { updateDuplicates: false }
    );
    if (r.status === 'created') trends++;
  }

  let ideas = 0;
  for (const i of SAMPLE_IDEAS) {
    const existing = await prisma.savedIdea.findFirst({ where: { title: i.title } });
    if (existing) continue;
    await prisma.savedIdea.create({ data: { ...i, isSample: true } });
    ideas++;
  }

  return {
    ok: true,
    trends,
    ideas,
    message: `Added ${trends} sample trends and ${ideas} sample ideas. All are labelled "Sample data — not live platform data." and can be removed with one click.`,
  };
}
