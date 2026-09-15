import { describe, expect, it } from 'vitest';
import { classifyAssetCurrency } from '../../src/core/services/asset-currency.js';

describe('classifyAssetCurrency (FR-08, TC-03)', () => {
  it('returns current when installed matches expected, regardless of manifest', () => {
    expect(classifyAssetCurrency('a', 'a', 'a')).toBe('current');
    expect(classifyAssetCurrency('a', 'stale', 'a')).toBe('current');
  });

  it('returns outdated when installed matches manifest but not expected', () => {
    expect(classifyAssetCurrency('a', 'a', 'b')).toBe('outdated');
  });

  it('returns modified when installed matches neither manifest nor expected', () => {
    expect(classifyAssetCurrency('c', 'a', 'b')).toBe('modified');
  });
});
