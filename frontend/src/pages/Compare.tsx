import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { GitCompareArrows } from 'lucide-react';
import { get, post } from '../api';
import type { TrendItem } from '../types';
import { PageTitle } from '../components/Layout';
import { Button, Card, EmptyState, Input, Skeleton, useToast } from '../components/ui';
import { TrendCard, PlatformBadge, ScoreBadge } from '../components/trend';
import { fmtNumber, fmtPercent, fmtAge } from '../lib/format';

const SERIES = ['#3987e5', '#199e70', '#c98500', '#9085e9', '#e66767']; // categorical slots 1,2,3,5,6 (dark-mode steps)

const chartTooltipStyle = {
  backgroundColor: 'rgb(var(--surface-1))',
  border: '1px solid rgb(var(--surface-3))',
  borderRadius: 12,
  fontSize: 12,
  color: 'rgb(var(--ink-1))',
};

export default function Compare() {
  const [items, setItems] = useState<TrendItem[] | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TrendItem[]>([]);
  const [result, setResult] = useState<{ items: TrendItem[]; summary: string; sharedHashtags: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const params = new URLSearchParams({ sort: 'trendScore', limit: '60' });
    if (search) params.set('search', search);
    const t = setTimeout(() => {
      get<{ items: TrendItem[] }>(`/trends?${params}`).then((r) => setItems(r.items)).catch(() => setItems([]));
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (item: TrendItem) => {
    setSelected((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev.filter((i) => i.id !== item.id);
      if (prev.length >= 5) {
        toast('info', 'Maximum 5 trends can be compared at once.');
        return prev;
      }
      return [...prev, item];
    });
  };

  const run = async () => {
    setBusy(true);
    try {
      setResult(await post('/compare', { ids: selected.map((i) => i.id) }));
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setBusy(false);
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.items.map((i, idx) => ({
      name: i.title.length > 22 ? i.title.slice(0, 21) + '…' : i.title,
      fullTitle: i.title,
      color: SERIES[idx % SERIES.length],
      views: i.views ?? 0,
      likes: i.likes ?? 0,
      comments: i.comments ?? 0,
      shares: i.shares ?? 0,
      viewsPerHour: i.viewsPerHour ?? 0,
      engagementRate: i.engagementRate ?? 0,
      trendScore: i.trendScore,
    }));
  }, [result]);

  return (
    <div>
      <PageTitle title="Trend Comparison" subtitle="Select 2–5 trends and compare their metrics, velocity, hashtags and structure side by side." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your library…" className="max-w-xs" />
        <span className="text-xs text-ink-3">{selected.length}/5 selected</span>
        <Button variant="primary" disabled={selected.length < 2} loading={busy} onClick={run}>
          <GitCompareArrows size={14} /> Compare
        </Button>
        {selected.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setSelected([]); setResult(null); }}>Clear</Button>}
      </div>

      {result && (
        <div className="mb-8 space-y-4">
          <Card className="p-5">
            <p className="mb-2 text-xs font-semibold">Summary</p>
            <p className="text-sm leading-relaxed text-ink-2">{result.summary}</p>
          </Card>

          {/* One small-multiple chart per metric — never mixed scales on one axis */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {([
              ['views', 'Views'],
              ['viewsPerHour', 'Views per hour'],
              ['engagementRate', 'Engagement rate (%)'],
              ['likes', 'Likes'],
              ['comments', 'Comments'],
              ['trendScore', 'Trend score (0–100)'],
            ] as const).map(([key, label]) => (
              <Card key={key} className="p-4">
                <p className="mb-2 text-xs font-semibold">{label}</p>
                <div className="h-40">
                  <ResponsiveContainer>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v: number) => fmtNumber(v)} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        contentStyle={chartTooltipStyle}
                        cursor={{ fill: 'rgb(var(--surface-2))' }}
                        formatter={(v: number | string) => [fmtNumber(Number(v)), label]}
                        labelFormatter={(_, payload) => (payload?.[0]?.payload as { fullTitle?: string })?.fullTitle ?? ''}
                      />
                      <Bar dataKey={key} radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {chartData.map((d) => <Cell key={d.fullTitle} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="border-b border-surface-3/60 text-left text-[11px] text-ink-3">
                  <th className="px-4 py-2.5 font-medium">Attribute</th>
                  {result.items.map((i, idx) => (
                    <th key={i.id} className="max-w-52 px-4 py-2.5 font-medium">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SERIES[idx % SERIES.length] }} />
                      <span className="line-clamp-2 inline text-ink-1">{i.title}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3/40">
                <CmpRow label="Platform">{result.items.map((i) => <PlatformBadge key={i.id} platformId={i.platformId} />)}</CmpRow>
                <CmpRow label="Trend score">{result.items.map((i) => <ScoreBadge key={i.id} item={i} size="sm" />)}</CmpRow>
                <CmpRow label="Views">{result.items.map((i) => <span key={i.id} className="tabular-nums">{fmtNumber(i.views)}</span>)}</CmpRow>
                <CmpRow label="Likes">{result.items.map((i) => <span key={i.id} className="tabular-nums">{fmtNumber(i.likes)}</span>)}</CmpRow>
                <CmpRow label="Comments">{result.items.map((i) => <span key={i.id} className="tabular-nums">{fmtNumber(i.comments)}</span>)}</CmpRow>
                <CmpRow label="Shares">{result.items.map((i) => <span key={i.id} className="tabular-nums">{fmtNumber(i.shares)}</span>)}</CmpRow>
                <CmpRow label="Views per hour">{result.items.map((i) => <span key={i.id} className="tabular-nums">{fmtNumber(i.viewsPerHour)}</span>)}</CmpRow>
                <CmpRow label="Engagement rate">{result.items.map((i) => <span key={i.id} className="tabular-nums">{fmtPercent(i.engagementRate, i.engagementEstimated)}</span>)}</CmpRow>
                <CmpRow label="Posting age">{result.items.map((i) => <span key={i.id}>{fmtAge(i.hoursSincePublished)}</span>)}</CmpRow>
                <CmpRow label="Audio">{result.items.map((i) => <span key={i.id} className="text-ink-2">{i.audio?.name ?? '—'}</span>)}</CmpRow>
                <CmpRow label="Hashtags">
                  {result.items.map((i) => (
                    <span key={i.id} className="flex flex-wrap gap-1">
                      {i.hashtags.slice(0, 5).map((h) => (
                        <span key={h} className={`rounded-md px-1.5 py-0.5 text-[10px] ${result.sharedHashtags.includes(h) ? 'bg-accent/20 text-accent-soft' : 'bg-surface-2 text-ink-3'}`}>#{h}</span>
                      ))}
                    </span>
                  ))}
                </CmpRow>
                <CmpRow label="Structure notes">{result.items.map((i) => <span key={i.id} className="text-ink-3">{i.notes ?? i.description?.slice(0, 90) ?? '—'}</span>)}</CmpRow>
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <p className="mb-3 text-xs font-semibold">Pick trends to compare</p>
      {!items ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No trends in your library yet" hint="Add content first, then come back to compare." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <TrendCard key={item.id} item={item} selectable selected={selected.some((i) => i.id === item.id)} onSelect={toggle} onOpen={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}

function CmpRow({ label, children }: { label: string; children: React.ReactNode[] }) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-ink-3">{label}</td>
      {(children as React.ReactNode[]).map((c, i) => <td key={i} className="max-w-52 px-4 py-2.5 align-top">{c}</td>)}
    </tr>
  );
}