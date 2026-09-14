import { describe, expect, it } from 'vitest';
import { calculateNearestRankP95 } from '../../src/infrastructure/diagnostics/p95.js';

describe('UT-17: Nearest-rank overhead p95 is deterministic (CA-18)', () => {
  it('returns null for empty samples', () => {
    expect(calculateNearestRankP95([])).toBeNull();
  });

  it('selects ceil(0.95 * n) for 100 synthetic ascending samples', () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1);
    const p95 = calculateNearestRankP95(samples);
    expect(p95).toBe(95);
    expect(p95! <= 100).toBe(true);
  });

  it('selects rank 19 for 20 synthetic samples and handles decimal rounding', () => {
    const samples = [
      12.1, 15.3, 16.0, 18.2, 19.5, 20.1, 22.4, 25.0, 26.2, 28.1,
      30.5, 32.0, 35.1, 38.4, 40.2, 41.5, 42.0, 43.1, 43.7, 49.9,
    ];
    const p95 = calculateNearestRankP95(samples);
    expect(p95).toBe(43.7);
    expect(p95! <= 100).toBe(true);
  });

  it('evaluates in-process threshold against 15ms target', () => {
    const passingSamples = Array.from({ length: 100 }, () => 1.2);
    const failingSamples = Array.from({ length: 100 }, () => 16.5);
    expect(calculateNearestRankP95(passingSamples)! <= 15).toBe(true);
    expect(calculateNearestRankP95(failingSamples)! <= 15).toBe(false);
  });
});
