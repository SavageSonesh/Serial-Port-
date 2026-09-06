import { describe, expect, it } from 'vitest';
import { addDays, formatDatePt, isIsoDate, lisbonToday } from './dates';

describe('dates', () => {
  it('uses the Europe/Lisbon calendar day', () => {
    // September: Lisbon is UTC+1 (WEST)
    expect(lisbonToday(new Date('2026-09-06T22:30:00Z'))).toBe('2026-09-06');
    expect(lisbonToday(new Date('2026-09-06T23:30:00Z'))).toBe('2026-09-07');
    // January: Lisbon is UTC+0 (WET)
    expect(lisbonToday(new Date('2026-01-10T23:30:00Z'))).toBe('2026-01-10');
    expect(lisbonToday(new Date('2026-01-11T00:10:00Z'))).toBe('2026-01-11');
  });
  it('prints DD-MM-YYYY', () => {
    expect(formatDatePt('2026-09-06')).toBe('06-09-2026');
    expect(() => formatDatePt('2026-13-01')).toThrow();
  });
  it('validates and adds days', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
