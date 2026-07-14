import { useState } from 'react';
import { Clapperboard, ScanSearch } from 'lucide-react';
import { post } from '../api';
import type { StructureAnalysis } from '../types';
import { PageTitle } from '../components/Layout';
import { Button, Card, Field, Input, Textarea, useToast } from '../components/ui';

export default function StructureAnalyzer() {
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState('');
  const [result, setResult] = useState<StructureAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const run = async () => {
    setBusy(true);
    try {
      setResult(
        await post<StructureAnalysis>('/generator/analyze-structure', {
          description,
          title: title || undefined,
          captionText: caption || undefined,
          durationSeconds: duration ? Number(duration) : undefined,
        })
      );
    } catch (e) {
      toast('error', (e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div>
      <PageTitle
        title="Video Structure Analyzer"
        subtitle="Describe a viral video in your own words and get a structural breakdown — hook, setup, payoff, pattern interrupts, editing, audio and CTA. This studies structure for learning; it never downloads or copies the video."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <Field label="Describe what happens in the video *" hint="Scene by scene, in your own words. Include how it opens, what changes, and how it ends.">
            <Textarea rows={8} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={'Example: Opens with "POV: your barista hates you" text over a fast zoom. Quick cuts between three coffee fails, captions on every beat, trending audio. Ends with a freeze frame and "follow for part 2".'} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Video title (optional)"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Approx. duration (seconds)"><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" /></Field>
          </div>
          <Field label="Caption text (optional)"><Input value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
          <div className="flex justify-end">
            <Button variant="primary" loading={busy} disabled={description.trim().length < 10} onClick={run}>
              <ScanSearch size={14} /> Analyze structure
            </Button>
          </div>
        </Card>

        {result ? (
          <Card className="space-y-3 p-5">
            <p className="flex items-center gap-2 text-xs font-semibold"><Clapperboard size={14} /> Structural breakdown</p>
            <Section label="Hook">{result.hook}</Section>
            <Section label="Setup">{result.setup}</Section>
            <Section label="Payoff">{result.payoff}</Section>
            <Section label="Pattern interrupt">{result.patternInterrupt}</Section>
            <Section label="Editing style">{result.editingStyle}</Section>
            <Section label="Caption style">{result.captionStyle}</Section>
            <Section label="Visual changes">{result.visualChanges}</Section>
            <Section label="Audio use">{result.audioUse}</Section>
            <Section label="Call to action">{result.callToAction}</Section>
            <Section label="Duration">{result.approximateDuration}</Section>
            <div>
              <p className="mb-1 text-[11px] font-semibold text-ink-3">Why viewers may keep watching</p>
              <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-1">
                {result.retentionFactors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <p className="rounded-xl bg-surface-2 p-3 text-[11px] leading-relaxed text-ink-3">{result.notes}</p>
          </Card>
        ) : (
          <Card className="grid place-items-center p-10 text-center">
            <div className="max-w-sm space-y-2">
              <Clapperboard size={28} className="mx-auto text-ink-3" />
              <p className="text-sm font-medium">The analysis appears here</p>
              <p className="text-xs leading-relaxed text-ink-3">
                The analyzer looks for known retention patterns (hooks, loops, pattern interrupts, caption strategy, audio use) in your description and explains how the structure works — so you can build your own original version.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-semibold text-ink-3">{label}</p>
      <p className="text-xs leading-relaxed text-ink-1">{children}</p>
    </div>
  );
}
