import { useEffect, useState } from 'react';
import { Lightbulb, Sparkles, BookmarkPlus, Wand2 } from 'lucide-react';
import { get, post } from '../api';
import type { GeneratedIdea, Niche } from '../types';
import { PageTitle } from '../components/Layout';
import { Button, Card, EmptyState, Field, Input, Select, Skeleton, useToast } from '../components/ui';

interface OllamaStatus {
  enabled: boolean;
  reachable: boolean;
  model: string;
  message?: string;
}

export default function IdeaGenerator() {
  const [niches, setNiches] = useState<Niche[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [niche, setNiche] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [count, setCount] = useState('5');
  const [useAi, setUseAi] = useState(false);
  const [ollama, setOllama] = useState<OllamaStatus | null>(null);
  const [ideas, setIdeas] = useState<GeneratedIdea[] | null>(null);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    get<Niche[]>('/niches').then(setNiches).catch(() => {});
    get<{ id: string; name: string }[]>('/generator/categories').then(setCategories).catch(() => {});
    get<OllamaStatus>('/generator/ollama-status').then(setOllama).catch(() => {});
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const r = await post<{ ideas: GeneratedIdea[]; source: string; aiMessage?: string }>('/generator/ideas', {
        niche: niche || undefined,
        categoryId: category || undefined,
        keywords: keywords ? keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
        count: Number(count),
        useAi,
      });
      setIdeas(r.ideas);
      setSource(r.source);
      if (r.aiMessage) toast('info', r.aiMessage);
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setBusy(false);
  };

  const saveIdea = async (idea: GeneratedIdea) => {
    try {
      await post('/ideas', {
        title: idea.title,
        hook: idea.hook,
        caption: idea.caption,
        hashtags: idea.hashtags.join(' '),
        format: idea.format,
        duration: idea.duration,
        visualStructure: idea.visualStructure,
        callToAction: idea.callToAction,
        angle: idea.angle,
        rationale: idea.rationale,
        category: idea.category,
        nicheName: niche || undefined,
        status: 'idea',
      });
      toast('success', 'Saved to your ideas.');
    } catch (e) {
      toast('error', (e as Error).message);
    }
  };

  return (
    <div>
      <PageTitle
        title="Content Idea Generator"
        subtitle="Combines proven short-form templates with the keywords, hashtags and audio from your collected trends. Works fully offline — optional local AI via Ollama can be enabled in Settings."
      />

      <Card className="mb-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Niche">
            <Select value={niche} onChange={(e) => setNiche(e.target.value)}>
              <option value="">All niches</option>
              {niches.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Mix of categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Extra keywords (comma-separated)">
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="octopus, deep sea" />
          </Field>
          <Field label="How many">
            <Select value={count} onChange={(e) => setCount(e.target.value)}>
              {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} ideas</option>)}
            </Select>
          </Field>
          <Field label="Engine">
            <Select value={useAi ? 'ai' : 'templates'} onChange={(e) => setUseAi(e.target.value === 'ai')}>
              <option value="templates">Templates (no AI needed)</option>
              <option value="ai">Local AI (Ollama){ollama && !ollama.reachable ? ' — not available' : ''}</option>
            </Select>
          </Field>
        </div>
        {useAi && ollama && !ollama.reachable && (
          <p className="mt-2 text-[11px] text-amber-500">{ollama.message ?? 'Ollama is not reachable — the template engine will be used instead.'}</p>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="primary" loading={busy} onClick={run}><Wand2 size={14} /> Generate ideas</Button>
        </div>
      </Card>

      {busy && !ideas && <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>}

      {ideas && (
        <>
          <p className="mb-3 text-xs text-ink-3">Generated by: <span className="font-medium text-ink-2">{source}</span></p>
          <div className="grid gap-4 md:grid-cols-2">
            {ideas.map((idea, i) => (
              <Card key={i} className="flex flex-col gap-2.5 p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">{idea.title}</p>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-ink-3">{idea.category}</span>
                </div>
                <p className="text-xs leading-relaxed text-ink-2">{idea.videoIdea}</p>
                <IdeaField label="Hook">{idea.hook}</IdeaField>
                <IdeaField label="Caption">{idea.caption}</IdeaField>
                <IdeaField label="Visual structure">{idea.visualStructure}</IdeaField>
                <IdeaField label="Call to action">{idea.callToAction}</IdeaField>
                <IdeaField label="Original angle">{idea.angle}</IdeaField>
                <IdeaField label="Why it could work">{idea.rationale}</IdeaField>
                <div className="flex flex-wrap gap-1">
                  {idea.hashtags.map((h) => <span key={h} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-3">#{h}</span>)}
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-[11px] text-ink-3">{idea.format} · {idea.duration}</span>
                  <Button size="sm" variant="secondary" onClick={() => saveIdea(idea)}><BookmarkPlus size={13} /> Save idea</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {!ideas && !busy && (
        <EmptyState
          icon={<Lightbulb size={28} />}
          title="No ideas generated yet"
          hint="Pick a niche or category and press Generate. The more trends you've collected, the more the generator has to work with."
          action={<Button variant="primary" onClick={run}><Sparkles size={14} /> Generate now</Button>}
        />
      )}
    </div>
  );
}

function IdeaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-xs">
      <span className="font-medium text-ink-3">{label}: </span>
      <span className="text-ink-1">{children}</span>
    </div>
  );
}
