// Shared trend-display components: platform badge, score badge with
// transparent breakdown tooltip, trend card and table row.
import { ExternalLink, Eye, Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, Activity, FlaskConical } from 'lucide-react';
import type { TrendItem, ScoreBreakdown } from '../types';
import { PLATFORM_NAMES } from '../types';
import { fmtNumber, fmtPercent, fmtAge, scoreBg } from '../lib/format';
import { Badge, cn } from './ui';

export function PlatformBadge({ platformId }: { platformId: string }) {
  const styles: Record<string, string> = {
    tiktok: 'bg-[color:var(--series-tiktok)]/15 text-[color:var(--series-tiktok)]',
    instagram: 'bg-[color:var(--series-instagram)]/15 text-[color:var(--series-instagram)]',
    youtube: 'bg-[color:var(--series-youtube)]/15 text-[color:var(--series-youtube)]',
    'google-trends': 'bg-[color:var(--series-google-trends)]/15 text-[color:var(--series-google-trends)]',
  };
  return <Badge className={styles[platformId] ?? 'bg-surface-3 text-ink-2'}>{PLATFORM_NAMES[platformId] ?? platformId}</Badge>;
}

export function SampleBadge() {
  return (
    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
      <FlaskConical size={11} /> Sample data — not live platform data
    </Badge>
  );
}

function BreakdownTooltip({ breakdown }: { breakdown: ScoreBreakdown }) {
  const rows = [
    { label: 'Views per hour', score: breakdown.velocityScore, weight: breakdown.weights.velocity, detail: breakdown.inputs.viewsPerHour != null ? `${fmtNumber(breakdown.inputs.viewsPerHour)}/h (log-scaled)` : 'unknown' },
    { label: 'Engagement rate', score: breakdown.engagementScore, weight: breakdown.weights.engagement, detail: breakdown.inputs.engagementRate != null ? fmtPercent(breakdown.inputs.engagementRate, breakdown.inputs.engagementEstimated) : 'unknown' },
    { label: 'Freshness', score: breakdown.freshnessScore, weight: breakdown.weights.freshness, detail: breakdown.inputs.hoursSincePublished != null ? `${Math.round(breakdown.inputs.hoursSincePublished)}h old` : 'unknown age' },
    { label: 'Cross-platform', score: breakdown.crossPlatformScore, weight: breakdown.weights.crossPlatform, detail: `${breakdown.inputs.crossPlatformCount} platform${breakdown.inputs.crossPlatformCount > 1 ? 's' : ''}` },
    { label: 'Comment activity', score: breakdown.commentScore, weight: breakdown.weights.comments, detail: breakdown.inputs.comments != null ? `${fmtNumber(breakdown.inputs.comments)} comments (log-scaled)` : 'unknown' },
  ];
  return (
    <div className="w-72 text-left">
      <p className="mb-2 text-[11px] font-semibold text-ink-1">How this score is calculated</p>
      <table className="w-full text-[11px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-surface-3/60">
              <td className="py-1 pr-2 text-ink-2">{r.label}</td>
              <td className="py-1 pr-2 text-right tabular-nums text-ink-1">{r.score}</td>
              <td className="py-1 pr-2 text-right tabular-nums text-ink-3">×{r.weight}</td>
              <td className="py-1 text-right text-ink-3">{r.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-3">
        Score = Σ (factor × weight). Views/hour and comments use logarithmic scaling so one huge creator doesn't distort results.
      </p>
    </div>
  );
}

export function ScoreBadge({ item, size = 'md' }: { item: TrendItem; size?: 'sm' | 'md' | 'lg' }) {
  let breakdown: ScoreBreakdown | null = null;
  try {
    breakdown = item.scoreBreakdown ? (JSON.parse(item.scoreBreakdown) as ScoreBreakdown) : null;
  } catch {
    breakdown = null;
  }
  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold tabular-nums',
        scoreBg(item.trendScore),
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      )}
    >
      {Math.round(item.trendScore)}
      <span className="font-normal opacity-80">· {item.trendLabel}</span>
    </span>
  );
  if (!breakdown) return badge;
  return (
    <span className="group relative inline-flex cursor-help">
      {badge}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 rounded-xl border border-surface-3 bg-surface-1 p-3 shadow-xl group-hover:block">
        <BreakdownTooltip breakdown={breakdown} />
      </span>
    </span>
  );
}

export function MetricRow({ item, compact }: { item: TrendItem; compact?: boolean }) {
  const stats = [
    { icon: Eye, value: fmtNumber(item.views), label: 'views' },
    { icon: Heart, value: fmtNumber(item.likes), label: 'likes' },
    { icon: MessageCircle, value: fmtNumber(item.comments), label: 'comments' },
    { icon: Share2, value: fmtNumber(item.shares), label: 'shares' },
  ];
  return (
    <div className={cn('flex flex-wrap items-center text-ink-2', compact ? 'gap-2.5 text-[11px]' : 'gap-3.5 text-xs')}>
      {stats.map(({ icon: Icon, value, label }) => (
        <span key={label} className="inline-flex items-center gap-1" title={label}>
          <Icon size={compact ? 11 : 12} className="text-ink-3" />
          <span className="tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  );
}

export function TrendCard({
  item,
  onToggleSave,
  onOpen,
  selectable,
  selected,
  onSelect,
}: {
  item: TrendItem;
  onToggleSave?: (item: TrendItem) => void;
  onOpen?: (item: TrendItem) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (item: TrendItem) => void;
}) {
  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border bg-surface-1 shadow-sm transition-all',
        selected ? 'border-accent ring-2 ring-accent/40' : 'border-surface-3/70 hover:border-surface-3'
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-surface-3 text-ink-3">
            <Activity size={28} />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <PlatformBadge platformId={item.platformId} />
          {item.isSample && <Badge className="bg-amber-500/90 text-white"><FlaskConical size={10} /> Sample</Badge>}
        </div>
        <div className="absolute right-2 top-2"><ScoreBadge item={item} size="sm" /></div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <button onClick={() => onOpen?.(item)} className="text-left text-[13px] font-medium leading-snug text-ink-1 hover:text-accent-soft line-clamp-2">
          {item.title}
        </button>
        <div className="flex items-center justify-between text-[11px] text-ink-3">
          <span className="truncate">{item.creator ? `@${item.creator.handle}` : 'Unknown creator'}</span>
          <span>{fmtAge(item.hoursSincePublished)}</span>
        </div>
        <MetricRow item={item} compact />
        <div className="flex flex-wrap gap-1 text-[10px] text-ink-3">
          {item.viewsPerHour != null && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 tabular-nums">{fmtNumber(item.viewsPerHour)}/h</span>}
          {item.engagementRate != null && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 tabular-nums">ER {fmtPercent(item.engagementRate, item.engagementEstimated)}</span>}
          {item.niche && <span className="rounded-md bg-surface-2 px-1.5 py-0.5">{item.niche.name}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex gap-1">
            {selectable && (
              <button
                onClick={() => onSelect?.(item)}
                className={cn('rounded-lg px-2 py-1 text-[11px] font-medium', selected ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2 hover:bg-surface-3')}
              >
                {selected ? 'Selected' : 'Select'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {onToggleSave && (
              <button
                onClick={() => onToggleSave(item)}
                className={cn('rounded-lg p-1.5 hover:bg-surface-2', item.saved ? 'text-accent-soft' : 'text-ink-3')}
                title={item.saved ? 'Remove from saved' : 'Save'}
              >
                {item.saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
              </button>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink-1"
                title="Open original in a new tab"
              >
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
