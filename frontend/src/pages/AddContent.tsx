import { useState } from 'react';
import { Link2, ListPlus, PencilLine, FileSpreadsheet, Braces, Info } from 'lucide-react';
import { post } from '../api';
import { PLATFORM_NAMES, COUNTRIES } from '../types';
import { PageTitle } from '../components/Layout';
import { Button, Card, Field, Input, Select, Tabs, Textarea, useToast } from '../components/ui';
import { PlatformBadge } from '../components/trend';

type Mode = 'url' | 'urls' | 'manual' | 'csv' | 'json';

interface Preview {
  detected: { platformId: string; format: string; cleanUrl: string; handle?: string };
  metadata: {
    title?: string; description?: string; thumbnailUrl?: string; creatorHandle?: string;
    views?: number; likes?: number; comments?: number; publishedAt?: string;
    partial: boolean; message?: string;
  } | null;
  duplicate: { id: number; title: string } | null;
}

export default function AddContent() {
  const [mode, setMode] = useState<Mode>('url');
  return (
    <div>
      <PageTitle
        title="Add Content"
        subtitle="Paste URLs from TikTok, Instagram, YouTube or YouTube Shorts. Where a platform blocks automatic data collection, an editable form lets you fill the gaps — items are never rejected for missing metrics."
      />
      <Tabs
        tabs={[
          { id: 'url' as Mode, label: 'Single URL' },
          { id: 'urls' as Mode, label: 'Multiple URLs' },
          { id: 'manual' as Mode, label: 'Manual entry' },
          { id: 'csv' as Mode, label: 'CSV import' },
          { id: 'json' as Mode, label: 'JSON import' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <div className="mt-4 max-w-3xl">
        {mode === 'url' && <SingleUrl />}
        {mode === 'urls' && <MultiUrl />}
        {mode === 'manual' && <ManualEntry />}
        {mode === 'csv' && <CsvImport />}
        {mode === 'json' && <JsonImport />}
      </div>
    </div>
  );
}

function LimitNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
      <Info size={14} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function MetricFields({ extra, setExtra }: { extra: Record<string, string>; setExtra: (e: Record<string, string>) => void }) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setExtra({ ...extra, [k]: e.target.value });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Field label="Views"><Input type="number" value={extra.views ?? ''} onChange={set('views')} /></Field>
      <Field label="Likes"><Input type="number" value={extra.likes ?? ''} onChange={set('likes')} /></Field>
      <Field label="Comments"><Input type="number" value={extra.comments ?? ''} onChange={set('comments')} /></Field>
      <Field label="Shares"><Input type="number" value={extra.shares ?? ''} onChange={set('shares')} /></Field>
      <Field label="Creator followers"><Input type="number" value={extra.followerCount ?? ''} onChange={set('followerCount')} /></Field>
      <Field label="Posted (date/time)"><Input type="datetime-local" value={extra.publishedAt ?? ''} onChange={set('publishedAt')} /></Field>
      <Field label="Niche"><Input value={extra.nicheName ?? ''} onChange={set('nicheName')} placeholder="e.g. Animal facts" /></Field>
      <Field label="Country">
        <Select value={extra.country ?? ''} onChange={set('country')}>
          <option value="">—</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Language"><Input value={extra.language ?? ''} onChange={set('language')} placeholder="en" /></Field>
      <Field label="Audio / song"><Input value={extra.audioName ?? ''} onChange={set('audioName')} /></Field>
      <Field label="Hashtags"><Input value={extra.hashtags ?? ''} onChange={set('hashtags')} placeholder="#one #two" /></Field>
      <Field label="Notes"><Input value={extra.notes ?? ''} onChange={set('notes')} /></Field>
    </div>
  );
}

function buildExtra(extra: Record<string, string>, title?: string) {
  const num = (v?: string) => (v != null && v !== '' ? Number(v) : undefined);
  return {
    title: title || extra.title || undefined,
    views: num(extra.views),
    likes: num(extra.likes),
    comments: num(extra.comments),
    shares: num(extra.shares),
    followerCount: num(extra.followerCount),
    publishedAt: extra.publishedAt || undefined,
    nicheName: extra.nicheName || undefined,
    country: extra.country || undefined,
    language: extra.language || undefined,
    audioName: extra.audioName || undefined,
    notes: extra.notes || undefined,
    creatorHandle: extra.creatorHandle || undefined,
    description: extra.description || undefined,
    hashtags: extra.hashtags ? extra.hashtags.split(/[\s,]+/).map((h) => h.replace(/^#/, '')).filter(Boolean) : undefined,
  };
}

function SingleUrl() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const check = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const p = await post<Preview>('/import/preview', { url });
      setPreview(p);
      setTitle(p.metadata?.title ?? '');
      setExtra((e) => ({
        ...e,
        views: p.metadata?.views != null ? String(p.metadata.views) : e.views ?? '',
        likes: p.metadata?.likes != null ? String(p.metadata.likes) : e.likes ?? '',
        comments: p.metadata?.comments != null ? String(p.metadata.comments) : e.comments ?? '',
        publishedAt: p.metadata?.publishedAt ? p.metadata.publishedAt.slice(0, 16) : e.publishedAt ?? '',
      }));
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await post<{ status: string; metadataMessage?: string }>('/import/url', { url, extra: buildExtra(extra, title) });
      toast('success', r.status === 'updated' ? 'Already in your library — updated with new data (old metrics kept as a snapshot).' : 'Added to your library.');
      setUrl(''); setPreview(null); setExtra({}); setTitle('');
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setSaving(false);
  };

  return (
    <Card className="space-y-4 p-5">
      <Field label="Video URL" hint="TikTok, Instagram, YouTube and YouTube Shorts links are detected automatically.">
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@creator/video/…" onKeyDown={(e) => e.key === 'Enter' && check()} />
          <Button variant="primary" loading={loading} onClick={check}><Link2 size={14} /> Fetch</Button>
        </div>
      </Field>

      {preview && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <PlatformBadge platformId={preview.detected.platformId} />
            <span className="rounded-md bg-surface-2 px-2 py-0.5 text-ink-2">{preview.detected.format}</span>
            {preview.detected.handle && <span className="text-ink-3">@{preview.detected.handle}</span>}
            {preview.duplicate && <span className="text-amber-500">Already in library as “{preview.duplicate.title}” — saving will update it.</span>}
          </div>
          {preview.metadata?.thumbnailUrl && <img src={preview.metadata.thumbnailUrl} alt="" className="h-36 rounded-xl object-cover" />}
          <LimitNote message={preview.metadata?.message} />
          <Field label="Title / caption"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter or edit the title" /></Field>
          <MetricFields extra={extra} setExtra={setExtra} />
          <div className="flex justify-end">
            <Button variant="primary" loading={saving} onClick={save}>Save to library</Button>
          </div>
        </>
      )}
    </Card>
  );
}

function MultiUrl() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ url: string; status: string; message?: string }[] | null>(null);
  const toast = useToast();

  const run = async () => {
    setBusy(true);
    setResults(null);
    try {
      const r = await post<{ imported: number; skipped: number; results: { url: string; status: string; message?: string }[] }>('/import/urls', { text });
      setResults(r.results);
      toast(r.skipped > 0 ? 'info' : 'success', `${r.imported} imported, ${r.skipped} skipped.`);
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Card className="space-y-4 p-5">
      <Field label="URLs — one per line (max 100)" hint="Metadata is fetched where each platform permits it; everything else can be edited later in the Explorer.">
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'https://www.youtube.com/shorts/…\nhttps://www.tiktok.com/@user/video/…\nhttps://www.instagram.com/reel/…'} />
      </Field>
      <div className="flex justify-end">
        <Button variant="primary" loading={busy} onClick={run} disabled={!text.trim()}><ListPlus size={14} /> Import all</Button>
      </div>
      {results && (
        <div className="max-h-64 divide-y divide-surface-3/50 overflow-y-auto rounded-xl border border-surface-3/60 text-xs">
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2">
              <span className={r.status === 'created' || r.status === 'updated' ? 'text-emerald-500' : 'text-amber-500'}>{r.status}</span>
              <span className="min-w-0 flex-1 truncate text-ink-2">{r.url}</span>
              {r.message && <span className="max-w-56 truncate text-ink-3" title={r.message}>{r.message}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ManualEntry() {
  const [platform, setPlatform] = useState('tiktok');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async () => {
    if (!title.trim()) { toast('error', 'A title is required for manual entries.'); return; }
    setSaving(true);
    try {
      await post('/trends', { ...buildExtra(extra, title), title, platformId: platform, url: url || null });
      toast('success', 'Added to your library.');
      setTitle(''); setUrl(''); setExtra({});
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setSaving(false);
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Platform">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {Object.entries(PLATFORM_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </Select>
        </Field>
        <Field label="URL (optional)"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
      </div>
      <Field label="Title / caption *"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Creator handle"><Input value={extra.creatorHandle ?? ''} onChange={(e) => setExtra({ ...extra, creatorHandle: e.target.value })} placeholder="without @" /></Field>
      <MetricFields extra={extra} setExtra={setExtra} />
      <div className="flex justify-end"><Button variant="primary" loading={saving} onClick={save}><PencilLine size={14} /> Add entry</Button></div>
    </Card>
  );
}

const CSV_TEMPLATE = `url,title,platform,creator,views,likes,comments,shares,published,niche,country,language,hashtags,audio,notes
https://www.youtube.com/shorts/EXAMPLE1,Example short,youtube,somechannel,1.2M,45K,1200,,2026-07-10,Educational shorts,United States,en,#learn #facts,,imported example
,Manual row without URL,tiktok,someuser,500000,60000,900,1500,2026-07-12,Couple comedy,Portugal,pt,#couple,funny beat,`;

function CsvImport() {
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const toast = useToast();

  const onFile = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ''));
    reader.readAsText(f);
  };

  const run = async () => {
    setBusy(true);
    setErrors([]);
    try {
      const r = await post<{ imported: number; skipped: number; errors: string[] }>('/import/csv', { csv });
      setErrors(r.errors);
      toast(r.skipped > 0 ? 'info' : 'success', `${r.imported} rows imported, ${r.skipped} skipped.`);
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Card className="space-y-4 p-5">
      <p className="text-xs leading-relaxed text-ink-3">
        Flexible headers: <code className="rounded bg-surface-2 px-1">url, title, platform, creator, views, likes, comments, shares, published, niche, country, language, hashtags, audio, notes</code>.
        Numbers accept shorthand like <code className="rounded bg-surface-2 px-1">1.2M</code> or <code className="rounded bg-surface-2 px-1">45K</code>. Rows are never rejected for missing metrics.
      </p>
      <div className="flex flex-wrap gap-2">
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-xs text-ink-3 file:mr-2 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:text-ink-1" />
        <Button size="sm" variant="ghost" onClick={() => setCsv(CSV_TEMPLATE)}>Insert template</Button>
      </div>
      <Textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="Paste CSV here or choose a file above…" className="font-mono text-[11px]" />
      <div className="flex justify-end"><Button variant="primary" loading={busy} disabled={!csv.trim()} onClick={run}><FileSpreadsheet size={14} /> Import CSV</Button></div>
      {errors.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-300">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}
    </Card>
  );
}

function JsonImport() {
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const run = async () => {
    setBusy(true);
    try {
      const parsed = JSON.parse(json) as unknown;
      const items = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown[] }).items;
      if (!Array.isArray(items)) throw new Error('Provide a JSON array of items, or { "items": [...] }');
      const r = await post<{ imported: number; skipped: number }>('/import/json', { items });
      toast(r.skipped > 0 ? 'info' : 'success', `${r.imported} items imported, ${r.skipped} skipped.`);
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Card className="space-y-4 p-5">
      <p className="text-xs text-ink-3">Accepts the format produced by this app's JSON export, or any array of objects with <code className="rounded bg-surface-2 px-1">title/url/platform/views/likes/…</code> fields.</p>
      <Textarea rows={8} value={json} onChange={(e) => setJson(e.target.value)} placeholder='[{"url": "https://…", "title": "…", "views": 12000}]' className="font-mono text-[11px]" />
      <div className="flex justify-end"><Button variant="primary" loading={busy} disabled={!json.trim()} onClick={run}><Braces size={14} /> Import JSON</Button></div>
    </Card>
  );
}
