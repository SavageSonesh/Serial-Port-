import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, Rows3, ExternalLink, Trash2, RefreshCw, Bookmark, BookmarkCheck, RadioTower, Search } from 'lucide-react';
import { get, patch, del, post } from '../api';
import type { TrendItem, MetricSnapshot } from '../types';
import { PLATFORM_NAMES, COUNTRIES } from '../types';
import { PageTitle } from '../components/Layout';
import { Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Skeleton, Tabs, Textarea, cn, useToast } from '../components/ui';
import { TrendCard, PlatformBadge, ScoreBadge, MetricRow } from '../components/trend';
import { fmtNumber, fmtPercent, fmtAge, fmtDate } from '../lib/format';

const SORTS = [
  { id: 'trendScore', name: 'Trend score' },
  { id: 'views', name: 'Views' },
  { id: 'viewsPerHour', name: 'Views per hour' },
  { id: 'engagementRate', name: 'Engagement rate' },
  { id: 'newest', name: 'Newest' },
  { id: 'mostLiked', name: 'Most liked' },
  { id: 'mostCommented', name: 'Most commented' },
];

export default function Explorer() {
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [items, setItems] = useState<TrendItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('trendScore');
  const [platform, setPlatform] = useState('');
  const [country, setCountry] = useState('');
  const [niche, setNiche] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [minViews, setMinViews] = useState('');
  const [detail, setDetail] = useState<TrendItem | null>(null);
  const [deleting, setDeleting] = useState<TrendItem | null>(null);
  const [niches, setNiches] = useState<{ id: number; name: string }[]>([]);
  const toast = useToast();

  const load = useCallback(() => {
    const params = new URLSearchParams({ sort, limit: '200' });
    if (platform) params.set('platform', platform);
    if (country) params.set('country', country);
    if (niche) params.set('niche', niche);
    if (savedOnly) params.set('saved', 'true');
    if (search) params.set('search', search);
    if (minViews) params.set('minViews', minViews);
    get<{ items: TrendItem[]; total: number }>(`/trends?${params}`)
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch((e) => toast('error', e.message));
  }, [sort, platform, country, niche, savedOnly, search, minViews, toast]);

  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);
  useEffect(() => { get<{ id: number; name: string }[]>('/niches').then(setNiches).catch(() => {}); }, []);

  const toggleSave = async (item: TrendItem) => {
    try {
      await patch(`/trends/${item.id}`, { saved: !item.saved });
      setItems((prev) => prev?.map((i) => (i.id === item.id ? { ...i, saved: !i.saved } : i)) ?? null);
      toast('success', item.saved ? 'Removed from saved.' : 'Saved.');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const remove = async (item: TrendItem) => {
    try {
      await del(`/trends/${item.id}`);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
      setDetail(null);
      toast('success', 'Trend deleted.');
    } catch (e) { toast('error', (e as Error).message); }
  };

  return (
    <div>
      <PageTitle
        title="Trend Explorer"
        subtitle={`${total} items in your local library.`}
        actions={<Tabs tabs={[{ id: 'grid' as const, label: 'Grid' }, { id: 'table' as const, label: 'Table' }]} value={view} onChange={setView} />}
      />

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, creators, hashtags, notes…" className="pl-9" />
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!w-auto text-xs">
          {SORTS.map((s) => <option key={s.id} value={s.id}>Sort: {s.name}</option>)}
        </Select>
        <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="!w-auto text-xs">
          <option value="">All platforms</option>
          {Object.entries(PLATFORM_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Select>
        <Select value={country} onChange={(e) => setCountry(e.target.value)} className="!w-auto text-xs">
          <option value="">All countries</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={niche} onChange={(e) => setNiche(e.target.value)} className="!w-auto text-xs">
          <option value="">All niches</option>
          {niches.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
        </Select>
        <Input value={minViews} onChange={(e) => setMinViews(e.target.value)} type="number" placeholder="Min views" className="!w-28 text-xs" />
        <Button size="sm" variant={savedOnly ? 'primary' : 'secondary'} onClick={() => setSavedOnly((s) => !s)}>
          <Bookmark size={13} /> Saved only
        </Button>
      </div>

      {!items ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Import URLs or CSV data from the Add Content page, or adjust the filters above." />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <TrendCard key={item.id} item={item} onToggleSave={toggleSave} onOpen={setDetail} />
          ))}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-surface-3/60 text-left text-[11px] text-ink-3">
                <th className="px-3 py-2.5 font-medium">Trend</th>
                <th className="px-3 py-2.5 font-medium">Platform</th>
                <th className="px-3 py-2.5 text-right font-medium">Views</th>
                <th className="px-3 py-2.5 text-right font-medium">Likes</th>
                <th className="px-3 py-2.5 text-right font-medium">Comments</th>
                <th className="px-3 py-2.5 text-right font-medium">Views/h</th>
                <th className="px-3 py-2.5 text-right font-medium">Engagement</th>
                <th className="px-3 py-2.5 font-medium">Score</th>
                <th className="px-3 py-2.5 font-medium">Age</th>
                <th className="px-3 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-3/40">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-surface-2/50">
                  <td className="max-w-72 px-3 py-2">
                    <button onClick={() => setDetail(i)} className="line-clamp-1 text-left font-medium text-ink-1 hover:text-accent-soft">{i.title}</button>
                    <span className="text-[10px] text-ink-3">{i.creator ? `@${i.creator.handle}` : ''} {i.niche ? `· ${i.niche.name}` : ''}</span>
                  </td>
                  <td className="px-3 py-2"><PlatformBadge platformId={i.platformId} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(i.views)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(i.likes)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(i.comments)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(i.viewsPerHour)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtPercent(i.engagementRate, i.engagementEstimated)}</td>
                  <td className="px-3 py-2"><ScoreBadge item={i} size="sm" /></td>
                  <td className="px-3 py-2 whitespace-nowrap text-ink-3">{fmtAge(i.hoursSincePublished)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => toggleSave(i)} className={cn('rounded-lg p-1.5 hover:bg-surface-2', i.saved ? 'text-accent-soft' : 'text-ink-3')} title="Save">
                        {i.saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                      {i.url && (
                        <a href={i.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2" title="Open original">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button onClick={() => setDeleting(i)} className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-rose-400" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {detail && (
        <TrendDetailModal
          item={detail}
          onClose={() => setDetail(null)}
          onChanged={(updated) => {
            setItems((prev) => prev?.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)) ?? null);
            setDetail(updated);
          }}
          onDelete={() => setDeleting(detail)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Delete this trend?"
        message={`"${deleting?.title ?? ''}" and its metric history will be permanently removed from your local database.`}
      />
    </div>
  );
}

function TrendDetailModal({ item, onClose, onChanged, onDelete }: { item: TrendItem; onClose: () => void; onChanged: (i: TrendItem) => void; onDelete: () => void }) {
  const toast = useToast();
  const [full, setFull] = useState<TrendItem | null>(null);
  const [metrics, setMetrics] = useState({ views: item.views ?? '', likes: item.likes ?? '', comments: item.comments ?? '', shares: item.shares ?? '' });
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { get<TrendItem>(`/trends/${item.id}`).then(setFull).catch(() => {}); }, [item.id]);

  const saveMetrics = async () => {
    setSaving(true);
    try {
      const updated = await patch<TrendItem>(`/trends/${item.id}`, {
        views: metrics.views === '' ? null : Number(metrics.views),
        likes: metrics.likes === '' ? null : Number(metrics.likes),
        comments: metrics.comments === '' ? null : Number(metrics.comments),
        shares: metrics.shares === '' ? null : Number(metrics.shares),
        notes,
      });
      onChanged(updated);
      toast('success', 'Updated. Previous metrics kept as a snapshot for growth tracking.');
    } catch (e) { toast('error', (e as Error).message); }
    setSaving(false);
  };

  const toggleMonitoring = async () => {
    try {
      const updated = await patch<TrendItem>(`/trends/${item.id}`, { monitoring: !item.monitoring });
      onChanged(updated);
      toast('info', updated.monitoring ? 'Monitoring on — refreshed on the schedule set in Settings (while the app is running).' : 'Monitoring off.');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await post<{ item: TrendItem | null; message?: string }>(`/trends/${item.id}/refresh`);
      if (r.item) onChanged(r.item);
      toast(r.message ? 'info' : 'success', r.message ?? 'Refreshed from the source.');
    } catch (e) { toast('error', (e as Error).message); }
    setRefreshing(false);
  };

  const snapshots: MetricSnapshot[] = full?.snapshots ?? [];

  return (
    <Modal open onClose={onClose} title="Trend details" wide>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <PlatformBadge platformId={item.platformId} />
            <ScoreBadge item={item} />
            {item.isSample && <span className="text-[11px] text-amber-500">Sample data — not live platform data</span>}
          </div>
          <p className="text-sm font-medium leading-snug">{item.title}</p>
          <p className="mt-1 text-xs text-ink-3">
            {item.creator ? `@${item.creator.handle}` : 'Unknown creator'}
            {item.followerCount != null && ` · ${fmtNumber(item.followerCount)} followers`}
            {` · published ${fmtDate(item.publishedAt)} (${fmtAge(item.hoursSincePublished)})`}
          </p>
        </div>
        <div className="flex gap-1.5">
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="secondary"><ExternalLink size={13} /> Open</Button>
            </a>
          )}
          {item.url && <Button size="sm" variant="secondary" loading={refreshing} onClick={refresh}><RefreshCw size={13} /> Refresh</Button>}
          <Button size="sm" variant={item.monitoring ? 'primary' : 'secondary'} onClick={toggleMonitoring}>
            <RadioTower size={13} /> {item.monitoring ? 'Monitoring' : 'Monitor'}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold">Update metrics</p>
          <p className="mb-2 text-[11px] text-ink-3">Yesterday's numbers are preserved as snapshots so you can see growth over time.</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Views"><Input type="number" value={metrics.views} onChange={(e) => setMetrics({ ...metrics, views: e.target.value })} /></Field>
            <Field label="Likes"><Input type="number" value={metrics.likes} onChange={(e) => setMetrics({ ...metrics, likes: e.target.value })} /></Field>
            <Field label="Comments"><Input type="number" value={metrics.comments} onChange={(e) => setMetrics({ ...metrics, comments: e.target.value })} /></Field>
            <Field label="Shares"><Input type="number" value={metrics.shares} onChange={(e) => setMetrics({ ...metrics, shares: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this interesting? What could you adapt?" /></Field>
          <div className="mt-2 flex justify-between">
            <Button size="sm" variant="ghost" className="text-rose-400" onClick={onDelete}><Trash2 size={13} /> Delete</Button>
            <Button size="sm" variant="primary" loading={saving} onClick={saveMetrics}>Save changes</Button>
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold">Details</p>
          <dl className="space-y-1.5 text-xs">
            <Row k="Current metrics"><MetricRow item={item} compact /></Row>
            <Row k="Views per hour">{fmtNumber(item.viewsPerHour)}</Row>
            <Row k="Engagement rate">{fmtPercent(item.engagementRate, item.engagementEstimated)}</Row>
            <Row k="Niche">{item.niche?.name ?? '—'}</Row>
            <Row k="Country / language">{item.country ?? '—'} / {item.language ?? '—'}</Row>
            <Row k="Audio">{item.audio?.name ?? '—'}</Row>
            <Row k="Format">{item.format ?? '—'}</Row>
            <Row k="Hashtags">
              {item.hashtags.length > 0 ? (
                <span className="flex flex-wrap gap-1">{item.hashtags.map((h) => <span key={h} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px]">#{h}</span>)}</span>
              ) : '—'}
            </Row>
          </dl>
          <p className="mb-1 mt-4 text-xs font-semibold">Metric history</p>
          {snapshots.length === 0 ? (
            <p className="text-[11px] text-ink-3">No snapshots yet. Update the metrics (or let monitoring refresh them) to start tracking growth.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-surface-3/60">
              <table className="w-full text-[11px]">
                <thead><tr className="text-left text-ink-3"><th className="px-2 py-1.5 font-medium">Captured</th><th className="px-2 py-1.5 text-right font-medium">Views</th><th className="px-2 py-1.5 text-right font-medium">Likes</th><th className="px-2 py-1.5 text-right font-medium">Comments</th></tr></thead>
                <tbody className="divide-y divide-surface-3/40">
                  {snapshots.map((s) => (
                    <tr key={s.id}>
                      <td className="px-2 py-1.5 text-ink-3">{new Date(s.capturedAt).toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{fmtNumber(s.views)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{fmtNumber(s.likes)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{fmtNumber(s.comments)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-ink-3">{k}</dt>
      <dd className="min-w-0 flex-1 text-ink-1">{children}</dd>
    </div>
  );
}
