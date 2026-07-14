import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Plus, Trash2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { get, post, patch, del } from '../api';
import type { SavedIdea } from '../types';
import { IDEA_STATUSES, PLATFORM_NAMES } from '../types';
import { PageTitle } from '../components/Layout';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Skeleton, Textarea, cn, useToast } from '../components/ui';
import { fmtDate } from '../lib/format';

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  medium: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  low: 'bg-surface-3 text-ink-2',
};

const STATUS_STYLE: Record<string, string> = {
  idea: 'bg-surface-3 text-ink-2',
  researching: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  'script-ready': 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-300',
  'ready-to-record': 'bg-violet-500/15 text-violet-500 dark:text-violet-300',
  recorded: 'bg-fuchsia-500/15 text-fuchsia-500 dark:text-fuchsia-300',
  editing: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  scheduled: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
  published: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  archived: 'bg-surface-2 text-ink-3',
};

export default function SavedIdeas() {
  const [ideas, setIdeas] = useState<SavedIdea[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SavedIdea | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SavedIdea | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    get<SavedIdea[]>(`/ideas?${params}`).then(setIdeas).catch((e) => toast('error', e.message));
  }, [statusFilter, search, toast]);

  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  const remove = async (idea: SavedIdea) => {
    try {
      await del(`/ideas/${idea.id}`);
      setIdeas((prev) => prev?.filter((i) => i.id !== idea.id) ?? null);
      toast('success', 'Idea deleted.');
    } catch (e) { toast('error', (e as Error).message); }
  };

  const quickStatus = async (idea: SavedIdea, status: string) => {
    try {
      const updated = await patch<SavedIdea>(`/ideas/${idea.id}`, {
        status,
        ...(status === 'recorded' ? { recorded: true } : {}),
        ...(status === 'editing' ? { recorded: true } : {}),
        ...(status === 'published' ? { recorded: true, edited: true, posted: true } : {}),
      });
      setIdeas((prev) => prev?.map((i) => (i.id === idea.id ? updated : i)) ?? null);
    } catch (e) { toast('error', (e as Error).message); }
  };

  return (
    <div>
      <PageTitle
        title="Saved Ideas"
        subtitle="Your content pipeline — from first spark to published video."
        actions={<Button variant="primary" size="sm" onClick={() => setEditing('new')}><Plus size={14} /> New idea</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ideas…" className="max-w-xs" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto text-xs">
          <option value="">All statuses</option>
          {IDEA_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {!ideas ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : ideas.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={28} />}
          title="No saved ideas yet"
          hint="Generate ideas from your trends, or add one manually."
          action={<Button variant="primary" onClick={() => setEditing('new')}><Plus size={14} /> New idea</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ideas.map((idea) => (
            <Card key={idea.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setEditing(idea)} className="text-left text-[13px] font-semibold leading-snug hover:text-accent-soft">{idea.title}</button>
                <button onClick={() => setDeleting(idea)} className="rounded-lg p-1 text-ink-3 hover:bg-surface-2 hover:text-rose-400" title="Delete"><Trash2 size={13} /></button>
              </div>
              {idea.hook && <p className="text-xs italic text-ink-2">“{idea.hook}”</p>}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={STATUS_STYLE[idea.status] ?? 'bg-surface-3 text-ink-2'}>{IDEA_STATUSES.find((s) => s.id === idea.status)?.name ?? idea.status}</Badge>
                <Badge className={PRIORITY_STYLE[idea.priority] ?? PRIORITY_STYLE.low}>{idea.priority} priority</Badge>
                {idea.intendedPlatform && <Badge className="bg-surface-2 text-ink-2">{PLATFORM_NAMES[idea.intendedPlatform] ?? idea.intendedPlatform}</Badge>}
                {idea.isSample && <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Sample</Badge>}
              </div>
              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">{idea.tags.map((t) => <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-3">{t}</span>)}</div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                {idea.plannedRecordingDate && <span>Record: {fmtDate(idea.plannedRecordingDate)}</span>}
                <span className={cn(idea.recorded && 'text-emerald-500')}>{idea.recorded ? '✓ recorded' : '· not recorded'}</span>
                <span className={cn(idea.edited && 'text-emerald-500')}>{idea.edited ? '✓ edited' : '· not edited'}</span>
                <span className={cn(idea.posted && 'text-emerald-500')}>{idea.posted ? '✓ posted' : '· not posted'}</span>
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <Select value={idea.status} onChange={(e) => quickStatus(idea, e.target.value)} className="!w-auto !px-2 !py-1 text-[11px]">
                  {IDEA_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                {idea.publishedUrl && (
                  <a href={idea.publishedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent-soft hover:underline">
                    <ExternalLink size={11} /> Published
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <IdeaEditor
          idea={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        title="Delete this idea?"
        message={`"${deleting?.title ?? ''}" will be permanently removed.`}
      />
    </div>
  );
}

function IdeaEditor({ idea, onClose, onSaved }: { idea: SavedIdea | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    title: idea?.title ?? '',
    hook: idea?.hook ?? '',
    caption: idea?.caption ?? '',
    hashtags: idea?.hashtags ?? '',
    format: idea?.format ?? '',
    duration: idea?.duration ?? '',
    visualStructure: idea?.visualStructure ?? '',
    callToAction: idea?.callToAction ?? '',
    notes: idea?.notes ?? '',
    status: idea?.status ?? 'idea',
    priority: idea?.priority ?? 'medium',
    intendedPlatform: idea?.intendedPlatform ?? '',
    plannedRecordingDate: idea?.plannedRecordingDate ? idea.plannedRecordingDate.slice(0, 10) : '',
    publishedUrl: idea?.publishedUrl ?? '',
    nicheName: idea?.niche?.name ?? '',
    tags: idea?.tags.join(', ') ?? '',
    recorded: idea?.recorded ?? false,
    edited: idea?.edited ?? false,
    posted: idea?.posted ?? false,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.title.trim()) { toast('error', 'Title is required.'); return; }
    setBusy(true);
    const payload = {
      title: f.title,
      hook: f.hook || null,
      caption: f.caption || null,
      hashtags: f.hashtags || null,
      format: f.format || null,
      duration: f.duration || null,
      visualStructure: f.visualStructure || null,
      callToAction: f.callToAction || null,
      notes: f.notes || null,
      status: f.status,
      priority: f.priority,
      intendedPlatform: f.intendedPlatform || null,
      plannedRecordingDate: f.plannedRecordingDate || null,
      publishedUrl: f.publishedUrl || null,
      nicheName: f.nicheName || null,
      tags: f.tags ? f.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      recorded: f.recorded,
      edited: f.edited,
      posted: f.posted,
    };
    try {
      if (idea) await patch(`/ideas/${idea.id}`, payload);
      else await post('/ideas', payload);
      toast('success', idea ? 'Idea updated.' : 'Idea created.');
      onSaved();
    } catch (e) { toast('error', (e as Error).message); }
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title={idea ? 'Edit idea' : 'New idea'} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Title *"><Input value={f.title} onChange={set('title')} /></Field></div>
        <Field label="Opening hook"><Input value={f.hook} onChange={set('hook')} /></Field>
        <Field label="Caption"><Input value={f.caption} onChange={set('caption')} /></Field>
        <Field label="Hashtags"><Input value={f.hashtags} onChange={set('hashtags')} placeholder="#one #two" /></Field>
        <Field label="Format"><Input value={f.format} onChange={set('format')} placeholder="e.g. POV skit" /></Field>
        <Field label="Duration"><Input value={f.duration} onChange={set('duration')} placeholder="30–45 seconds" /></Field>
        <Field label="Call to action"><Input value={f.callToAction} onChange={set('callToAction')} /></Field>
        <div className="sm:col-span-2"><Field label="Visual structure"><Textarea rows={2} value={f.visualStructure} onChange={set('visualStructure')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Notes"><Textarea rows={2} value={f.notes} onChange={set('notes')} /></Field></div>
        <Field label="Status">
          <Select value={f.status} onChange={set('status')}>
            {IDEA_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={f.priority} onChange={set('priority')}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </Select>
        </Field>
        <Field label="Intended platform">
          <Select value={f.intendedPlatform} onChange={set('intendedPlatform')}>
            <option value="">—</option>
            {Object.entries(PLATFORM_NAMES).filter(([id]) => id !== 'google-trends').map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </Select>
        </Field>
        <Field label="Planned recording date"><Input type="date" value={f.plannedRecordingDate} onChange={set('plannedRecordingDate')} /></Field>
        <Field label="Niche"><Input value={f.nicheName} onChange={set('nicheName')} /></Field>
        <Field label="Tags (comma-separated)"><Input value={f.tags} onChange={set('tags')} /></Field>
        <div className="sm:col-span-2"><Field label="Final published URL"><Input value={f.publishedUrl} onChange={set('publishedUrl')} placeholder="https://…" /></Field></div>
        <div className="flex gap-4 sm:col-span-2">
          {(['recorded', 'edited', 'posted'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-xs text-ink-2">
              <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="accent-indigo-500" />
              <CheckCircle2 size={12} className={f[k] ? 'text-emerald-500' : 'text-ink-3'} /> {k}
            </label>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={busy} onClick={save}>{idea ? 'Save changes' : 'Create idea'}</Button>
      </div>
    </Modal>
  );
}
