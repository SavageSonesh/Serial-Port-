import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Sparkles, Bookmark, RadioTower, Trophy, Network, FlaskConical, Search } from 'lucide-react';
import { get, post, del } from '../api';
import type { DashboardStats, TrendItem } from '../types';
import { PLATFORM_NAMES, COUNTRIES } from '../types';
import { PageTitle } from '../components/Layout';
import { Card, Skeleton, EmptyState, Button, useToast, Select, Input, HelpTip } from '../components/ui';
import { TrendCard, PlatformBadge, ScoreBadge } from '../components/trend';
import { fmtNumber } from '../lib/format';

const PLATFORM_COLOR: Record<string, string> = {
  tiktok: 'var(--series-tiktok)',
  instagram: 'var(--series-instagram)',
  youtube: 'var(--series-youtube)',
  'google-trends': 'var(--series-google-trends)',
};

function StatTile({ icon: Icon, label, value, sub, help }: { icon: typeof TrendingUp; label: string; value: string; sub?: string; help?: string }) {
  const tile = (
    <Card className="flex items-start gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/12 bg-accent/10 text-accent-soft">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-ink-3">{label}</p>
        <p className="truncate text-lg font-semibold tabular-nums leading-tight">{value}</p>
        {sub && <p className="truncate text-[11px] text-ink-3">{sub}</p>}
      </div>
    </Card>
  );
  return help ? <HelpTip text={help}>{tile}</HelpTip> : tile;
}

const chartTooltipStyle = {
  backgroundColor: 'rgb(var(--surface-1))',
  border: '1px solid rgb(var(--surface-3))',
  borderRadius: 12,
  fontSize: 12,
  color: 'rgb(var(--ink-1))',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [items, setItems] = useState<TrendItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Dashboard filters
  const [platform, setPlatform] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [niche, setNiche] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [minViews, setMinViews] = useState('');
  const [minEngagement, setMinEngagement] = useState('');
  const [format, setFormat] = useState('');
  const [niches, setNiches] = useState<{ id: number; name: string }[]>([]);

  const load = () => {
    get<DashboardStats>('/dashboard/stats').then(setStats).catch((e) => setError(String(e.message)));
    get<{ id: number; name: string }[]>('/niches').then(setNiches).catch(() => {});
  };
  useEffect(load, []);

  useEffect(() => {
    const params = new URLSearchParams({ sort: 'trendScore', limit: '8' });
    if (platform) params.set('platform', platform);
    if (country) params.set('country', country);
    if (language) params.set('language', language);
    if (niche) params.set('niche', niche);
    if (minViews) params.set('minViews', minViews);
    if (minEngagement) params.set('minEngagement', minEngagement);
    if (format) params.set('format', format);
    if (dateRange) {
      const days = Number(dateRange);
      params.set('dateFrom', new Date(Date.now() - days * 86_400_000).toISOString());
    }
    get<{ items: TrendItem[] }>(`/trends?${params}`).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [platform, country, language, niche, dateRange, minViews, minEngagement, format]);

  const seedDemo = async () => {
    const r = await post<{ message: string }>('/settings/demo-data');
    toast('info', r.message);
    load();
  };
  const removeDemo = async () => {
    const r = await del<{ removedTrends: number; removedIdeas: number }>('/settings/demo-data');
    toast('success', `Removed ${r.removedTrends} sample trends and ${r.removedIdeas} sample ideas.`);
    load();
  };

  const activityData = useMemo(
    () => (stats?.activity ?? []).map((a) => ({ ...a, day: a.date.slice(5) })),
    [stats]
  );

  if (error) {
    return <EmptyState title="Backend not reachable" hint={error} action={<Button onClick={() => { setError(null); load(); }}>Retry</Button>} />;
  }

  return (
    <div>
      <PageTitle
        title="Dashboard"
        subtitle="Your private trend-research overview. All numbers come from your local database only."
        actions={
          stats?.hasSampleData ? (
            <Button size="sm" variant="secondary" onClick={removeDemo}><FlaskConical size={13} /> Remove sample data</Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={seedDemo}><FlaskConical size={13} /> Load sample data</Button>
          )
        }
      />

      {/* Stat tiles */}
      {!stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile icon={TrendingUp} label="Trends collected" value={String(stats.totalTrends)} />
          <StatTile icon={Sparkles} label="New today" value={String(stats.newToday)} />
          <StatTile icon={Bookmark} label="Saved ideas" value={String(stats.savedIdeas)} />
          <StatTile icon={RadioTower} label="Monitoring" value={String(stats.monitored)} sub="videos being watched" />
          <StatTile
            icon={Trophy}
            label="Highest trend score"
            value={stats.highestScore ? String(Math.round(stats.highestScore.score)) : '—'}
            sub={stats.highestScore?.item.title}
          />
          <StatTile
            icon={Network}
            label="Cross-platform topics"
            value={String(stats.crossPlatformTopics)}
            sub={stats.bestPlatform ? `Best platform: ${PLATFORM_NAMES[stats.bestPlatform]}` : undefined}
            help="Topics appearing on 2+ platforms, grouped by local keyword similarity. Best platform = highest average trend score."
          />
        </div>
      )}

      {/* Charts */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <p className="mb-1 text-xs font-semibold">Trend activity — items added per day</p>
          <p className="mb-3 text-[11px] text-ink-3">Last 14 days</p>
          {activityData.length === 0 ? <Skeleton className="h-44" /> : (
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={activityData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} interval={2} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgb(var(--surface-2))' }} />
                  <Bar dataKey="added" name="Items added" fill="var(--chart-accent)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <p className="mb-1 text-xs font-semibold">Platform comparison — average trend score</p>
          <p className="mb-3 text-[11px] text-ink-3">Across all collected items (0–100)</p>
          {!stats ? <Skeleton className="h-44" /> : stats.platformComparison.length === 0 ? (
            <EmptyState title="No data yet" hint="Add content or load the sample data to see platform comparisons." />
          ) : (
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={stats.platformComparison.map((p) => ({ ...p, name: PLATFORM_NAMES[p.platformId] }))} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: 'rgb(var(--surface-2))' }}
                    formatter={(value: number | string, name: string, entry) => {
                      const p = entry?.payload as { count: number; totalViews: number };
                      return [`${value} (from ${p.count} items, ${fmtNumber(p.totalViews)} total views)`, name];
                    }}
                  />
                  <Bar dataKey="avgScore" name="Avg score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {stats.platformComparison.map((p) => (
                      <Cell key={p.platformId} fill={PLATFORM_COLOR[p.platformId]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Top niches */}
      {stats && stats.topNiches.length > 0 && (
        <Card className="mt-4 p-4">
          <p className="mb-3 text-xs font-semibold">Top trending niches</p>
          <div className="flex flex-wrap gap-2">
            {stats.topNiches.map((n) => (
              <div key={n.name} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5 text-xs">
                <span className="font-medium">{n.name}</span>
                <span className="tabular-nums text-ink-3">{n.count} items · avg {n.avgScore}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters + top trends */}
      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="mr-2 text-xs font-semibold">Top trends</p>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="!w-auto text-xs">
            <option value="">All platforms</option>
            {Object.entries(PLATFORM_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </Select>
          <Select value={country} onChange={(e) => setCountry(e.target.value)} className="!w-auto text-xs">
            <option value="">All countries</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Language (e.g. en)" className="!w-32 text-xs" />
          <Select value={niche} onChange={(e) => setNiche(e.target.value)} className="!w-auto text-xs">
            <option value="">All niches</option>
            {niches.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
          </Select>
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="!w-auto text-xs">
            <option value="">Any date</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Input value={minViews} onChange={(e) => setMinViews(e.target.value)} placeholder="Min views" type="number" className="!w-28 text-xs" />
          <Input value={minEngagement} onChange={(e) => setMinEngagement(e.target.value)} placeholder="Min ER %" type="number" className="!w-24 text-xs" />
          <Select value={format} onChange={(e) => setFormat(e.target.value)} className="!w-auto text-xs">
            <option value="">Any format</option>
            <option value="short-video">Short video</option>
            <option value="reel">Reel</option>
            <option value="video">Video</option>
            <option value="image">Image</option>
            <option value="other">Other</option>
          </Select>
        </div>
        {!items ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Search size={28} />}
            title="No trends match these filters"
            hint="Add content from the Add Content page, run a source search, or load the clearly-labelled sample data to explore the interface."
            action={<Link to="/add"><Button variant="primary">Add content</Button></Link>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => <TrendCard key={item.id} item={item} />)}
          </div>
        )}
      </div>

      {/* Recently added */}
      {stats && stats.recentItems.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <p className="px-4 pt-4 text-xs font-semibold">Recently added</p>
          <div className="mt-2 divide-y divide-surface-3/50">
            {stats.recentItems.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <PlatformBadge platformId={i.platformId} />
                <span className="min-w-0 flex-1 truncate text-ink-1">{i.title}</span>
                <span className="hidden tabular-nums text-ink-3 sm:block">{fmtNumber(i.views)} views</span>
                <ScoreBadge item={i} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
