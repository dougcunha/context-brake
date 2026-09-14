export function calculateNearestRankP95(samples: readonly number[]): number | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.ceil(0.95 * sorted.length);
  const index = Math.max(0, rank - 1);
  const value = sorted[index];
  return value !== undefined ? Number(value.toFixed(1)) : null;
}
