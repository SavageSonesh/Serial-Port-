export function fmtNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
}

export function fmtPercent(n: number | null | undefined, estimated = false): string {
  if (n == null) return '—';
  return `${n.toFixed(1)}%${estimated ? ' (est.)' : ''}`;
}

export function fmtAge(hours: number | null | undefined): string {
  if (hours == null) return 'unknown age';
  if (hours < 1) return '<1h ago';
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function scoreColor(score: number): string {
  if (score >= 85) return 'text-fuchsia-500 dark:text-fuchsia-400';
  if (score >= 70) return 'text-rose-500 dark:text-rose-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  if (score >= 25) return 'text-emerald-600 dark:text-emerald-400';
  return 'text-ink-3';
}

export function scoreBg(score: number): string {
  if (score >= 85) return 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300';
  if (score >= 70) return 'bg-rose-500/15 text-rose-600 dark:text-rose-300';
  if (score >= 50) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  if (score >= 25) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  return 'bg-surface-3 text-ink-2';
}
