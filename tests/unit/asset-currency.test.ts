import { describe, expect, it } from 'vitest';
import { classifyAssetCurrency } from '../../src/core/services/asset-currency.js';

describe('classifyAssetCurrency (FR-08, TC-03)', () => {
  it.each([
    { installed: 'a', manifest: 'a', expected: 'a', currency: 'current' },
    { installed: 'a', manifest: 'a', expected: 'b', currency: 'outdated' },
    { installed: 'c', manifest: 'a', expected: 'b', currency: 'modified' },
  ])('classifies installed $installed with manifest $manifest and expected $expected as $currency', ({ installed, manifest, expected, currency }) => {
    expect(classifyAssetCurrency(installed, manifest, expected)).toBe(currency);
  });
});
