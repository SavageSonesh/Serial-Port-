import { useEffect, useState } from 'react';
import { Network, RefreshCw } from 'lucide-react';
import { get } from '../api';
import type { TrendItem } from '../types';
import { PageTitle } from '../components/Layout';
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui';
import { PlatformBadge, ScoreBadge } from '../components/trend';
import { fmtNumber } from '../lib/format';

interface Group {
  label: string;
  platforms: string[];
  sharedKeywords: string[];
  items: TrendItem[];
}

const LABEL_STYLE: Record<string, string> = {
  'Appearing on all three platforms': 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300',
  'Appearing on two platforms': 'bg-accent/15 text-accent-soft',
};

export default function CrossPlatform() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true);
    get<{ groups: Group[] }>('/cross-platform')
      .then((r) => setGroups(r.groups))
      .catch(() => setGroups([]))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  const multi = groups?.filter((g) => g.platforms.filter((p) => p !== 'google-trends').length >= 2) ?? [];
  const single = groups?.filter((g) => g.platforms.filter((p) => p !== 'google-trends').length < 2) ?? [];

  return (
    <div>
      <PageTitle
        title="Cross-Platform Trends"
        subtitle="Topics grouped by local keyword, hashtag, audio and date similarity — no cloud AI involved. Items in multi-platform groups get a cross-platform boost in their trend score."
        actions={<Button size="sm" onClick={load} loading={busy}><RefreshCw size={13} /> Re-group</Button>}
      />

      {!groups ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : groups.length === 0 ? (
        <EmptyState icon={<Network size={28} />} title="No trends collected yet" hint="Add content from at least two platforms to see topics that trend everywhere." />
      ) : (
        <div className="space-y-8">
          {multi.length === 0 && (
            <Card className="p-4 text-xs text-ink-3">
              No topic appears on multiple platforms yet. Groups form automatically when titles, hashtags, audio names and publish dates overlap.
            </Card>
          )}
          {multi.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-semibold">Trending across platforms</p>
              <div className="space-y-4">{multi.map((g, i) => <GroupCard key={i} group={g} />)}</div>
            </section>
          )}
          {single.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-semibold">Single-platform topics</p>
              <div className="grid gap-4 md:grid-cols-2">{single.map((g, i) => <GroupCard key={i} group={g} compact />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({ group, compact }: { group: Group; compact?: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className={LABEL_STYLE[group.label] ?? 'bg-surface-3 text-ink-2'}>{group.label}</Badge>
        {group.platforms.map((p) => <PlatformBadge key={p} platformId={p} />)}
        {group.sharedKeywords.length > 0 && (
          <span className="text-[11px] text-ink-3">
            Shared keywords: {group.sharedKeywords.slice(0, 6).join(', ')}
          </span>
        )}
      </div>
      <div className="divide-y divide-surface-3/40">
        {group.items.slice(0, compact ? 3 : 8).map((i) => (
          <div key={i.id} className="flex items-center gap-3 py-2 text-xs">
            <PlatformBadge platformId={i.platformId} />
            {i.url ? (
              <a href={i.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-ink-1 hover:text-accent-soft">{i.title}</a>
            ) : (
              <span className="min-w-0 flex-1 truncate text-ink-1">{i.title}</span>
            )}
            <span className="hidden tabular-nums text-ink-3 sm:block">{fmtNumber(i.views)} views</span>
            <ScoreBadge item={i} size="sm" />
          </div>
        ))}
        {group.items.length > (compact ? 3 : 8) && (
          <p className="pt-2 text-[11px] text-ink-3">+{group.items.length - (compact ? 3 : 8)} more in this topic</p>
        )}
      </div>
    </Card>
  );
}
