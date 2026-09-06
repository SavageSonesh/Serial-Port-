/** Formats integer cents as Portuguese currency text, e.g. 1350 -> "13,50€". */
export function formatEuro(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Invalid cents: ${cents}`);
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return `${euros},${rest.toString().padStart(2, '0')}€`;
}

/** Cents -> editable text without the euro sign, e.g. 1350 -> "13,50". */
export function centsToInput(cents: number): string {
  return formatEuro(cents).replace('€', '');
}

/**
 * Parses user input like "13,50", "13.5", "13", "13,50 €" into integer cents.
 * Returns null when the text is not a valid non-negative amount.
 */
export function parseEuro(input: string): number | null {
  const cleaned = input.replace(/€/g, '').replace(/\s+/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  const cents = parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
  return Number.isSafeInteger(cents) ? cents : null;
}
