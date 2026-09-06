const LISBON = 'Europe/Lisbon';

/** Today's calendar date in Europe/Lisbon as YYYY-MM-DD, regardless of device timezone. */
export function lisbonToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LISBON,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** YYYY-MM-DD -> DD-MM-YYYY (printed format). */
export function formatDatePt(iso: string): string {
  if (!isIsoDate(iso)) throw new Error(`Invalid ISO date: ${iso}`);
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

/** Adds days to a YYYY-MM-DD calendar date (pure calendar arithmetic, no timezone). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Long human label, e.g. "sábado, 6 de setembro de 2026". */
export function longDatePt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
