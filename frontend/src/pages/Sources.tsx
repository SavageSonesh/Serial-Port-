import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { Youtube, TrendingUp, Database, Plus, Trash2, Search, Download } from 'lucide-react';
import { get, post, del } from '../api';
import { COUNTRIES } from '../types';
import { PageTitle } from '../components/Layout';
import { Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, useToast } from '../components/ui';

interface ConnectorInfo {
  type: string;
  name: string;
  capability: string;
  automatic: boolean;
  limitation: string | null;
}

const chartTooltipStyle = {
  backgroundColor: 'rgb(var(--surface-1))',
  border: '1px solid rgb(var(--surface-3))',
  borderRadius: 12,
  fontSize: 12,
  color: 'rgb(var(--ink-1))',
};

export default function Sources() {
  const [connectors, setConnectors] = useState<ConnectorInfo[] | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    get<{ youtubeApiKeyConfigured: boolean; connectors: ConnectorInfo[] }>('/sources')
      .then((r) => { setConnectors(r.connectors); setHasKey(r.youtubeApiKeyConfigured); })
      .catch(() => setConnectors([]));
  }, []);

  return (
    <div>
      <PageTitle
        title="Sources"
        subtitle="What each platform allows — honestly. Where automatic collection is blocked by the platform, manual entry and CSV import always work."
      />

      {!connectors ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {connectors.map((c) => (
            <Card key={c.type} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-sm font-semibold">{c.name}</p>
                <Badge className={c.automatic ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}>
                  {c.automatic ? 'Automatic' : 'Manual-first'}
                </Badge>
                {c.type === 'youtube' && (
                  <Badge className={hasKey ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-surface-3 text-ink-2'}>
                    {hasKey ? 'API key configured' : 'No API key'}
                  </Badge>
                )}
              </div>
              <p className="text-xs leading-relaxed text-ink-2">{c.capability}</p>
              {c.limitation && <p className="mt-2 rounded-xl bg-surface-2 p-2.5 text-[11px] leading-relaxed text-ink-3">{c.limitation}</p>}
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <YouTubeSearch hasKey={hasKey} />
        <GoogleTrendsSearch />
      </div>

      <div className="mt-6">
        <Watchlist />
      </div>
    </div>
  );
}

function YouTubeSearch({ hasKey }: { hasKey: boolean }) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('Worldwide');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ videoId: string; url: string; title: string; channelTitle: string; thumbnailUrl?: string }[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const toast = useToast();

  const run = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await post<{ ok: boolean; results: typeof results; message?: string }>('/sources/youtube/search', { query, country });
      setResults(r.results ?? []);
      if (!r.ok && r.message) setMessage(r.message);
    } catch (e) { toast('error', (e as Error).message); }
    setBusy(false);
  };

  const importOne = async (url: string) => {
    setImporting(url);
    try {
      await post('/import/url', { url, extra: { country } });
      toast('success', 'Imported into your library.');
    } catch (e) { toast('error', (e as Error).message); }
    setImporting(null);
  };

  return (
    <Card className="p-5">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Youtube size={15} /> YouTube search</p>
      <p className="mb-3 text-[11px] text-ink-3">
        {hasKey ? 'Searches use your local YouTube Data API key.' : 'Needs a free YouTube Data API key in backend/.env — without it, paste video URLs on the Add Content page instead.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. interesting animal facts" className="min-w-48 flex-1" onKeyDown={(e) => e.key === 'Enter' && run()} />
        <Select value={country} onChange={(e) => setCountry(e.target.value)} className="!w-auto text-xs">
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Button variant="primary" loading={busy} disabled={!query.trim()} onClick={run}><Search size={14} /> Search</Button>
      </div>
      {message && <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">{message}</p>}
      {results && results.length > 0 && (
        <div className="mt-3 max-h-80 divide-y divide-surface-3/40 overflow-y-auto rounded-xl border border-surface-3/60">
          {results.map((r) => (
            <div key={r.videoId} className="flex items-center gap-3 px-3 py-2 text-xs">
              {r.thumbnailUrl && <img src={r.thumbnailUrl} alt="" className="h-9 w-16 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="line-clamp-1 font-medium text-ink-1 hover:text-accent-soft">{r.title}</a>
                <p className="text-[10px] text-ink-3">{r.channelTitle}</p>
              </div>
              <Button size="sm" variant="secondary" loading={importing === r.url} onClick={() => importOne(r.url)}><Download size={12} /> Import</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function GoogleTrendsSearch() {
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('Worldwide');
  const [timeRange, setTimeRange] = useState('30d');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; interestOverTime: { time: string; value: number }[]; relatedQueries: { query: string; value: string }[]; message?: string } | null>(null);
  const toast = useToast();

  const run = async () => {
    setBusy(true);
    try {
      setResult(await post('/sources/google-trends/search', { keyword, country, timeRange }));
    } catch (e) { toast('error', (e as Error).message); }
    setBusy(false);
  };

  const avg = useMemo(() => {
    const pts = result?.interestOverTime ?? [];
    return pts.length > 0 ? pts.reduce((s, p) => s + p.value, 0) / pts.length : 0;
  }, [result]);

  const saveAsTrend = async () => {
    try {
      await post('/sources/google-trends/save', {
        keyword,
        country,
        avgInterest: avg,
        relatedQueries: result?.relatedQueries.map((r) => r.query) ?? [],
      });
      toast('success', 'Saved to your library as a Google Trends item.');
    } catch (e) { toast('error', (e as Error).message); }
  };

  return (
    <Card className="p-5">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><TrendingUp size={15} /> Google Trends</p>
      <p className="mb-3 text-[11px] text-ink-3">Free unofficial endpoint — rate limits happen; errors are shown, never fatal.</p>
      <div className="flex flex-wrap gap-2">
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. couple challenge" className="min-w-40 flex-1" onKeyDown={(e) => e.key === 'Enter' && run()} />
        <Select value={country} onChange={(e) => setCountry(e.target.value)} className="!w-auto text-xs">
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="!w-auto text-xs">
          <option value="1d">Past day</option>
          <option value="7d">Past week</option>
          <option value="30d">Past month</option>
          <option value="90d">Past 90 days</option>
          <option value="12m">Past year</option>
        </Select>
        <Button variant="primary" loading={busy} disabled={!keyword.trim()} onClick={run}><Search size={14} /> Search</Button>
      </div>

      {result && !result.ok && result.message && (
        <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">{result.message}</p>
      )}
      {result?.ok && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-2">Search interest over time <span className="text-ink-3">(avg {Math.round(avg)}/100)</span></p>
            <Button size="sm" variant="secondary" onClick={saveAsTrend}><Plus size={12} /> Save as trend</Button>
          </div>
          <div className="h-36">
            <ResponsiveContainer>
              <LineChart data={result.interestOverTime} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} interval="preserveStartEnd" minTickGap={40} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                <ChartTooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="value" name="Interest" stroke="var(--chart-accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {result.relatedQueries.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-ink-3">Related queries</p>
              <div className="flex flex-wrap gap-1.5">
                {result.relatedQueries.slice(0, 12).map((q, i) => (
                  <button key={i} onClick={() => setKeyword(q.query)} className="rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-surface-3" title={`Interest: ${q.value}`}>
                    {q.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Watchlist() {
  const [items, setItems] = useState<{ id: number; query: string; country: string | null }[] | null>(null);
  const [text, setText] = useState('');
  const toast = useToast();

  const load = () => get<typeof items>('/niches/watchlist').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!text.trim()) return;
    try {
      await post('/niches/watchlist', { query: text.trim() });
      setText('');
      load();
      toast('success', 'Added to your watchlist.');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const remove = async (id: number) => {
    await del(`/niches/watchlist/${id}`);
    load();
  };

  return (
    <Card className="p-5">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Database size={15} /> Keyword watchlist</p>
      <p className="mb-3 text-[11px] text-ink-3">Keywords you're tracking — one click runs them through Google Trends or YouTube search above.</p>
      <div className="mb-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder='e.g. "interesting animal facts", "Portugal trends"' onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button variant="primary" onClick={add} disabled={!text.trim()}><Plus size={14} /> Add</Button>
      </div>
      {!items ? <Skeleton className="h-16" /> : items.length === 0 ? (
        <EmptyState title="Watchlist is empty" hint='Add keywords like "couple challenge" or "viral food" to keep them one click away.' />
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((w) => (
            <span key={w.id} className="flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-1.5 text-xs">
              {w.query}
              <button onClick={() => remove(w.id)} className="text-ink-3 hover:text-rose-400" title="Remove"><Trash2 size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
