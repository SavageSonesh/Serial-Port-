import { useEffect, useState } from 'react';
import { Save, DatabaseBackup, ArchiveRestore, Trash2, FileDown, FlaskConical, ShieldCheck } from 'lucide-react';
import { get, put, post, del } from '../api';
import { COUNTRIES } from '../types';
import { PageTitle } from '../components/Layout';
import { Button, Card, ConfirmDialog, Field, Input, Select, Skeleton, useToast } from '../components/ui';

interface SettingsPayload {
  settings: Record<string, string>;
  youtubeApiKeyConfigured: boolean;
  countries: string[];
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [s, setS] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [backups, setBackups] = useState<{ name: string; size: number; createdAt: string }[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const toast = useToast();

  const load = () => {
    get<SettingsPayload>('/settings').then((d) => { setData(d); setS(d.settings); }).catch((e) => toast('error', e.message));
    get<{ backups: { name: string; size: number; createdAt: string }[] }>('/settings/backups').then((r) => setBackups(r.backups)).catch(() => {});
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    try {
      await put('/settings', s);
      toast('success', 'Settings saved.');
    } catch (e) { toast('error', (e as Error).message); }
    setSaving(false);
  };

  const backup = async () => {
    try {
      const r = await post<{ file: string }>('/settings/backup');
      toast('success', `Backup created: ${r.file}`);
      load();
    } catch (e) { toast('error', (e as Error).message); }
  };

  const restore = async (name: string) => {
    try {
      const r = await post<{ message: string }>('/settings/restore', { name });
      toast('info', r.message);
    } catch (e) { toast('error', (e as Error).message); }
  };

  const clearAll = async () => {
    try {
      const r = await post<{ message: string }>('/settings/clear-all', { confirm: 'DELETE' });
      toast('success', r.message);
    } catch (e) { toast('error', (e as Error).message); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setS({ ...s, [k]: e.target.value });

  if (!data) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div>
      <PageTitle title="Settings" subtitle="Everything is stored locally. Secrets (API keys) live only in backend/.env and never reach the browser." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold">Defaults</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default country">
              <Select value={s.defaultCountry ?? 'Worldwide'} onChange={set('defaultCountry')}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Default language"><Input value={s.defaultLanguage ?? ''} onChange={set('defaultLanguage')} placeholder="en" /></Field>
            <Field label="Default niche"><Input value={s.defaultNiche ?? ''} onChange={set('defaultNiche')} placeholder="e.g. Animal facts" /></Field>
            <Field label="Default date range">
              <Select value={s.defaultDateRange ?? '30d'} onChange={set('defaultDateRange')}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </Select>
            </Field>
            <Field label="Theme">
              <Select value={s.theme ?? 'dark'} onChange={set('theme')}>
                <option value="dark">Dark (default)</option>
                <option value="light">Light</option>
              </Select>
            </Field>
            <Field label="Export format">
              <Select value={s.exportFormat ?? 'csv'} onChange={set('exportFormat')}>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold">Data refresh (monitoring)</p>
          <p className="text-[11px] leading-relaxed text-ink-3">
            Items marked “Monitoring” are refreshed on this schedule — <strong>only while the local server is running</strong>. Platforms that block automatic collection keep their manual metrics.
          </p>
          <Field label="Refresh interval">
            <Select value={s.refreshInterval ?? 'manual'} onChange={set('refreshInterval')}>
              <option value="manual">Manual only</option>
              <option value="1h">Every hour</option>
              <option value="3h">Every 3 hours</option>
              <option value="6h">Every 6 hours</option>
              <option value="24h">Daily</option>
            </Select>
          </Field>
          <Button size="sm" variant="secondary" onClick={async () => {
            try {
              const r = await post<{ refreshed: number; skipped: number }>('/monitoring/refresh');
              toast('success', `Refreshed ${r.refreshed} monitored items (${r.skipped} unchanged/skipped).`);
            } catch (e) { toast('error', (e as Error).message); }
          }}>Refresh monitored items now</Button>
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold">YouTube API</p>
          <p className="text-[11px] leading-relaxed text-ink-3">
            Status: {data.youtubeApiKeyConfigured
              ? '✅ A key is configured in backend/.env — statistics and search are enabled.'
              : 'No key configured. The app still works (basic metadata via oEmbed); add a free key for full statistics and search.'}
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-ink-3">
            <li>Create a free key at console.cloud.google.com → APIs → YouTube Data API v3.</li>
            <li>Put <code className="rounded bg-surface-2 px-1">YOUTUBE_API_KEY=your-key</code> in <code className="rounded bg-surface-2 px-1">backend/.env</code>.</li>
            <li>Restart <code className="rounded bg-surface-2 px-1">npm run dev</code>. The key never leaves your machine.</li>
          </ol>
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold">Local AI (Ollama) — optional</p>
          <p className="text-[11px] leading-relaxed text-ink-3">The idea generator works fully without AI. If Ollama is installed, enable it here for AI-written ideas.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Enable local AI">
              <Select value={s.ollamaEnabled ?? 'false'} onChange={set('ollamaEnabled')}>
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </Select>
            </Field>
            <Field label="Model name"><Input value={s.ollamaModel ?? ''} onChange={set('ollamaModel')} placeholder="llama3.2" /></Field>
            <div className="col-span-2">
              <Field label="Ollama base URL"><Input value={s.ollamaBaseUrl ?? ''} onChange={set('ollamaBaseUrl')} placeholder="http://localhost:11434" /></Field>
            </div>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold">Exports</p>
          <p className="text-[11px] text-ink-3">Downloads are generated locally from your database.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/export/trends.csv" download><Button size="sm" variant="secondary"><FileDown size={13} /> Trends CSV</Button></a>
            <a href="/api/export/trends.json" download><Button size="sm" variant="secondary"><FileDown size={13} /> Trends JSON</Button></a>
            <a href="/api/export/ideas.csv" download><Button size="sm" variant="secondary"><FileDown size={13} /> Ideas CSV</Button></a>
            <a href="/api/export/ideas.json" download><Button size="sm" variant="secondary"><FileDown size={13} /> Ideas JSON</Button></a>
            <a href="/api/export/report" download><Button size="sm" variant="secondary"><FileDown size={13} /> Trend report</Button></a>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold">Database backup & restore</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={backup}><DatabaseBackup size={13} /> Create backup</Button>
          </div>
          {backups.length > 0 && (
            <div className="max-h-40 divide-y divide-surface-3/40 overflow-y-auto rounded-xl border border-surface-3/60 text-[11px]">
              {backups.map((b) => (
                <div key={b.name} className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  <span className="text-ink-3">{(b.size / 1024).toFixed(0)} KB</span>
                  <Button size="sm" variant="ghost" onClick={() => setRestoreTarget(b.name)}><ArchiveRestore size={12} /> Restore</Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-3">Backups are stored in <code className="rounded bg-surface-2 px-1">backend/data/backups/</code>. You can also run <code className="rounded bg-surface-2 px-1">npm run backup</code> / <code className="rounded bg-surface-2 px-1">npm run restore</code>.</p>
        </Card>

        <Card className="space-y-3 border-rose-500/30 p-5">
          <p className="text-sm font-semibold text-rose-500">Danger zone</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={async () => {
              const r = await del<{ removedTrends: number; removedIdeas: number }>('/settings/demo-data');
              toast('success', `Removed ${r.removedTrends} sample trends and ${r.removedIdeas} sample ideas.`);
            }}>
              <FlaskConical size={13} /> Remove all sample data
            </Button>
            <Button size="sm" variant="danger" onClick={() => setConfirmClear(true)}><Trash2 size={13} /> Clear ALL data</Button>
          </div>
        </Card>

        <Card className="space-y-2 p-5 lg:col-span-2">
          <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15} className="text-emerald-500" /> Privacy</p>
          <p className="text-[11px] leading-relaxed text-ink-3">
            TrendRadar Local binds to 127.0.0.1 only and is never exposed publicly. No accounts, no cloud database, no analytics, no telemetry, no ads. All data lives in
            <code className="mx-1 rounded bg-surface-2 px-1">backend/prisma/dev.db</code> on this computer. Secrets stay in <code className="rounded bg-surface-2 px-1">.env</code> (git-ignored).
          </p>
        </Card>
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <Button variant="primary" loading={saving} onClick={save}><Save size={14} /> Save settings</Button>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAll}
        title="Clear all data?"
        message="This permanently deletes every trend, idea, snapshot and search from your local database. Niches and settings are kept. Consider creating a backup first."
        confirmLabel="Delete everything"
      />
      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => restoreTarget && restore(restoreTarget)}
        title="Restore this backup?"
        message={`The current database will be replaced by "${restoreTarget}". The server restarts afterwards — your dev command will relaunch it automatically.`}
        confirmLabel="Restore"
      />
    </div>
  );
}
