import { describe, expect, it } from 'vitest';
import { calculateNearestRankP95 } from '../../src/infrastructure/diagnostics/p95.js';

const HUNDRED_DESCENDING = Array.from({ length: 100 }, (_, index) => 100 - index);
const TWELVE_SHUFFLED = [7.1, 12.4, 3.5, 9.9, 1.2, 11.8, 5.5, 2.6, 10.3, 4.4, 8.7, 6.2];

describe('UT-17: Nearest-rank overhead p95 is deterministic (CA-18)', () => {
  it.each([
    { case: 'no samples', samples: [], p95: null },
    { case: 'one sample', samples: [12.34], p95: 12.3 },
    { case: '100 descending samples', samples: HUNDRED_DESCENDING, p95: 95 },
    { case: '12 shuffled samples', samples: TWELVE_SHUFFLED, p95: 12.4 },
  ])('selects rank ceil(0.95 * n) of the sorted samples, rounded to 0.1 ms, for $case', ({ samples, p95 }) => {
    expect(calculateNearestRankP95(samples)).toBe(p95);
  });
});
