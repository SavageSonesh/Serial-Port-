import { describe, expect, it } from 'vitest';
import { centsToInput, formatEuro, parseEuro } from './money';

describe('money', () => {
  it('formats cents in Portuguese style', () => {
    expect(formatEuro(1350)).toBe('13,50€');
    expect(formatEuro(400)).toBe('4,00€');
    expect(formatEuro(5)).toBe('0,05€');
    expect(formatEuro(3400)).toBe('34,00€');
  });
  it('rejects non-integer cents', () => {
    expect(() => formatEuro(13.5)).toThrow();
    expect(() => formatEuro(-1)).toThrow();
  });
  it('parses user input exactly', () => {
    expect(parseEuro('13,50')).toBe(1350);
    expect(parseEuro('13.5')).toBe(1350);
    expect(parseEuro('13')).toBe(1300);
    expect(parseEuro('13,50 €')).toBe(1350);
    expect(parseEuro('0,1')).toBe(10);
    expect(parseEuro('abc')).toBeNull();
    expect(parseEuro('1,234')).toBeNull();
    expect(parseEuro('-5')).toBeNull();
    expect(centsToInput(1200)).toBe('12,00');
  });
});
