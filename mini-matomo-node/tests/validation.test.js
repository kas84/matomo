const { describe, it, expect } = require('vitest');
const { isValidSiteId, normalizeUrl, coerceTimestamp } = require('../src/core/validation');

describe('validation helpers', () => {
  it('validates siteId strings', () => {
    expect(isValidSiteId('123')).toBe(true);
    expect(isValidSiteId('')).toBe(false);
    expect(isValidSiteId('   ')).toBe(false);
    expect(isValidSiteId(null)).toBe(false);
  });

  it('normalizes valid URLs and rejects invalid ones', () => {
    expect(normalizeUrl('https://example.com/path?x=1')).toBe('https://example.com/path?x=1');
    expect(normalizeUrl('notaurl')).toBeNull();
  });

  it('coerces timestamps to Date or returns null when invalid', () => {
    const now = coerceTimestamp();
    expect(now).toBeInstanceOf(Date);

    const fromString = coerceTimestamp('2024-05-01T00:00:00Z');
    expect(fromString?.toISOString()).toBe('2024-05-01T00:00:00.000Z');

    expect(coerceTimestamp('bad-date')).toBeNull();
  });
});
