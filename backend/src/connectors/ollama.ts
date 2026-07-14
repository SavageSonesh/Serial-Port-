// Optional local-AI integration via Ollama (http://localhost:11434 by default).
// The application works fully without Ollama installed — every call degrades
// gracefully to the template generator.

import { logger } from '../logger.js';
import { getSettings } from '../lib/settings.js';

export interface OllamaStatus {
  enabled: boolean;
  reachable: boolean;
  baseUrl: string;
  model: string;
  models: string[];
  message?: string;
}

export async function ollamaStatus(): Promise<OllamaStatus> {
  const settings = await getSettings();
  const enabled = settings.ollamaEnabled === 'true';
  const baseUrl = settings.ollamaBaseUrl || 'http://localhost:11434';
  const model = settings.ollamaModel || 'llama3.2';
  const status: OllamaStatus = { enabled, reachable: false, baseUrl, model, models: [] };
  if (!enabled) {
    status.message = 'Local AI is disabled. Enable it in Settings once Ollama is installed.';
    return status;
  }
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { models?: { name: string }[] };
    status.reachable = true;
    status.models = (data.models ?? []).map((m) => m.name);
    if (status.models.length === 0) {
      status.message = 'Ollama is running but has no models. Run e.g. `ollama pull llama3.2`.';
    }
  } catch {
    status.message = `Could not reach Ollama at ${baseUrl}. Is it installed and running? The template generator still works without it.`;
  }
  return status;
}

export async function ollamaGenerate(prompt: string): Promise<{ ok: boolean; text?: string; message?: string }> {
  const status = await ollamaStatus();
  if (!status.enabled) return { ok: false, message: status.message };
  if (!status.reachable) return { ok: false, message: status.message ?? 'Ollama is not reachable.' };
  try {
    const res = await fetch(`${status.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: status.model, prompt, stream: false }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, message: `Ollama returned ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as { response?: string };
    return { ok: true, text: data.response ?? '' };
  } catch (err) {
    logger.warn('Ollama generate failed', { error: String(err) });
    return { ok: false, message: `Ollama request failed: ${String(err)}` };
  }
}
