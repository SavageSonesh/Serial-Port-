import { describe, it, expect } from 'vitest';
import { parseCsv, parseCsvObjects, toCsv } from '../src/lib/csv.js';
import { csvRowToInput } from '../src/routes/import.js';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with commas and escaped quotes', () => {
    expect(parseCsv('title,notes\n"Hello, world","She said ""hi"""')).toEqual([
      ['title', 'notes'],
      ['Hello, world', 'She said "hi"'],
    ]);
  });

  it('handles CRLF and newlines inside quotes', () => {
    expect(parseCsv('a,b\r\n"line1\nline2",x')).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'x'],
    ]);
  });

  it('skips empty trailing rows', () => {
    expect(parseCsv('a,b\n1,2\n\n')).toHaveLength(2);
  });
});

describe('parseCsvObjects', () => {
  it('maps rows to objects with normalized headers', () => {
    const rows = parseCsvObjects('Video URL,View Count\nhttp://x,100');
    expect(rows[0].videourl).toBe('http://x');
    expect(rows[0].viewcount).toBe('100');
  });
});

describe('csvRowToInput', () => {
  it('maps aliases and parses shorthand numbers', () => {
    const input = csvRowToInput({
      url: 'https://www.tiktok.com/@u/video/123',
      caption: 'My video',
      views: '1.2M',
      likes: '45K',
      comments: '1,234',
      niche: 'Animal facts',
      tags: '#cats #dogs',
    });
    expect(input.platformId).toBe('tiktok');
    expect(input.title).toBe('My video');
    expect(input.views).toBe(1_200_000);
    expect(input.likes).toBe(45_000);
    expect(input.comments).toBe(1234);
    expect(input.nicheName).toBe('Animal facts');
    expect(input.hashtags).toEqual(['cats', 'dogs']);
  });

  it('detects platform from the platform column when no URL is given', () => {
    const input = csvRowToInput({ platform: 'YouTube Shorts', title: 'X' });
    expect(input.platformId).toBe('youtube');
  });

  it('leaves missing metrics as null rather than failing', () => {
    const input = csvRowToInput({ platform: 'instagram', title: 'No metrics' });
    expect(input.views).toBeNull();
    expect(input.likes).toBeNull();
  });
});

describe('toCsv', () => {
  it('round-trips values that need quoting', () => {
    const csv = toCsv([['a', 'b'], ['with,comma', 'with "quote"']]);
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['with,comma', 'with "quote"'],
    ]);
  });
});
