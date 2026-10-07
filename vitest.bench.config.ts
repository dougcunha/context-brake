import { defineConfig, type ViteUserConfig } from 'vitest/config';

export const BENCH_DIRECTORY = 'tests/bench/';
export const BENCH_FILE_PATTERN = `${BENCH_DIRECTORY}**/*.test.ts`;
const BENCH_TIMEOUT_MS = 30000;

export function benchConfig(): ViteUserConfig {
  return {
    test: {
      include: [BENCH_FILE_PATTERN],
      testTimeout: BENCH_TIMEOUT_MS,
      pool: 'forks',
      poolOptions: { forks: { singleFork: true } },
    },
  };
}

export default defineConfig(() => benchConfig());
