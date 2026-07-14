// Video Structure Analyzer — heuristic analysis of a user-described video.
// Studies content STRUCTURE only; never downloads or reproduces the video.

export interface StructureInput {
  description: string;
  title?: string;
  captionText?: string;
  durationSeconds?: number;
  platform?: string;
}

export interface StructureAnalysis {
  hook: string;
  setup: string;
  payoff: string;
  patternInterrupt: string;
  editingStyle: string;
  captionStyle: string;
  visualChanges: string;
  audioUse: string;
  callToAction: string;
  approximateDuration: string;
  retentionFactors: string[];
  notes: string;
}

const HOOK_PATTERNS: [RegExp, string][] = [
  [/pov[:\s]/i, 'POV framing — instantly puts the viewer inside the scenario.'],
  [/\b(you won'?t believe|wait for it|watch till the end)\b/i, 'Curiosity-gap hook — promises a payoff to hold attention.'],
  [/\?(\s|$)/m, 'Question hook — opens a loop the viewer wants closed.'],
  [/\b(\d+ (things|ways|facts|reasons|tips))\b/i, 'List hook — sets clear expectations of multiple payoffs.'],
  [/\b(nobody|no one|99%|most people)\b/i, 'Exclusivity hook — implies secret knowledge.'],
  [/\b(stop|don'?t|never)\b/i, 'Command hook — interrupts scrolling with an imperative.'],
  [/\b(i tried|i tested|we tried)\b/i, 'First-person experiment hook — borrowed credibility through experience.'],
];

export function analyzeStructure(input: StructureInput): StructureAnalysis {
  const text = [input.title, input.description, input.captionText].filter(Boolean).join('\n');
  const lower = text.toLowerCase();

  const hookMatches = HOOK_PATTERNS.filter(([re]) => re.test(text)).map(([, msg]) => msg);
  const firstLine = input.description.split(/\n|\. /)[0]?.trim() ?? '';

  const hasCTA = /\b(follow|subscribe|comment|like|share|save|tag|link in bio|part 2)\b/i.test(lower);
  const ctaText = hasCTA
    ? 'Explicit CTA detected (follow/comment/share style). It converts attention into an action while the viewer is still engaged.'
    : 'No explicit CTA detected — the video may rely on profile clicks. Adding a soft CTA in the final 2 seconds usually lifts follows.';

  const fastCut = /\b(fast|quick|rapid|cuts?|jump ?cuts?|zoom)\b/i.test(lower);
  const textOnScreen = /\b(caption|text on screen|subtitle|on-screen)\b/i.test(lower);
  const trendingAudio = /\b(trending (audio|sound|song)|viral (audio|sound)|original sound|music)\b/i.test(lower);
  const duration = input.durationSeconds;

  const retention: string[] = [];
  if (hookMatches.length > 0) retention.push('Strong scroll-stopping hook in the first 1–2 seconds.');
  if (fastCut) retention.push('Frequent visual changes reset viewer attention every few seconds.');
  if (textOnScreen) retention.push('On-screen text lets the video work with sound off and doubles the information channels.');
  if (trendingAudio) retention.push('Audio choice rides an existing recognition/recall loop.');
  if (/\b(part 2|series|episode)\b/i.test(lower)) retention.push('Serialisation creates a reason to visit the profile.');
  if (duration && duration <= 35) retention.push('Short runtime keeps completion rate (a key ranking signal) high.');
  if (retention.length === 0) retention.push('Retention likely depends on topic interest; consider adding a stronger opening loop and mid-video pattern interrupt.');

  return {
    hook:
      hookMatches.length > 0
        ? `${hookMatches.join(' ')} Opening beat: “${firstLine.slice(0, 120)}”.`
        : `No classic hook pattern detected. Opening beat: “${firstLine.slice(0, 120)}”. Consider opening with a question, bold claim, or the most dramatic frame.`,
    setup:
      'The setup should establish context in one breath. From your description, the premise is introduced early; keep everything before the first payoff under ~5 seconds.',
    payoff: /\b(reveal|twist|ending|result|verdict|answer)\b/i.test(lower)
      ? 'A clear payoff/reveal is present — the video closes the loop the hook opened, which is the core of rewatchable structure.'
      : 'No explicit payoff described. Viral structure usually needs one concrete moment the hook has been promising.',
    patternInterrupt: fastCut
      ? 'Visual pattern interrupts detected (cuts/zooms). These reset the viewer’s attention clock roughly every 3–5 seconds.'
      : 'No pattern interrupt described. Adding a camera angle change, zoom, prop, or caption flash mid-video prevents drop-off at the midpoint.',
    editingStyle: [
      fastCut ? 'Fast-cut editing' : 'Steady pacing',
      textOnScreen ? 'with on-screen captions' : 'without described captions',
      duration ? `across ~${duration}s` : '',
    ]
      .filter(Boolean)
      .join(' ') + '.',
    captionStyle: textOnScreen
      ? 'Caption-forward style — readable without audio, which platforms reward with broader distribution.'
      : 'Caption use unclear. Bold keyword captions in the first frame typically improve 1-second retention.',
    visualChanges: fastCut
      ? 'Multiple visual state changes described — scene/angle changes are doing the retention work.'
      : 'Few visual changes described. Aim for a visible change every 3–5 seconds (angle, zoom, location, prop, text).',
    audioUse: trendingAudio
      ? 'Uses trending/recognisable audio — this both aids discovery and triggers pattern recognition in the feed.'
      : 'Audio strategy unclear. Trending audio (used legally within the platform) or a distinctive voiceover both work; silence rarely does.',
    callToAction: ctaText,
    approximateDuration: duration
      ? `~${duration} seconds ${duration <= 35 ? '(short — favors completion rate)' : duration <= 60 ? '(standard short-form length)' : '(long for shorts — needs exceptional retention)'} `
      : 'Duration not provided — most breakout short-form content lands between 20 and 45 seconds.',
    retentionFactors: retention,
    notes:
      'This analysis studies structure for learning purposes. Use it to build your own original video — do not re-upload or copy the source content.',
  };
}
