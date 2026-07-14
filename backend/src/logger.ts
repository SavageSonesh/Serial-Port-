// Minimal structured logger — local console only, no telemetry, no remote sinks.

type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const extra = meta !== undefined ? ` ${safeStringify(meta)}` : '';
  const line = `[${ts}] ${level.toUpperCase()} ${msg}${extra}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function safeStringify(v: unknown): string {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
};
