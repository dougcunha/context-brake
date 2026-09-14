import { configDefaults, defineConfig } from 'vitest/config';
import { processLaneGlobs, TEST_FILE_PATTERN } from './tests/test-lanes.js';

const GLOBAL_TIMEOUT_MS = 30000;
const PARALLEL_GROUP_ORDER = 0;
const PROCESS_GROUP_ORDER = 1;

export default defineConfig({
  test: {
    testTimeout: GLOBAL_TIMEOUT_MS,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
      exclude: [],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'parallel',
          include: [TEST_FILE_PATTERN],
          exclude: [...configDefaults.exclude, ...processLaneGlobs()],
          sequence: { groupOrder: PARALLEL_GROUP_ORDER },
        },
      },
      {
        extends: true,
        test: {
          name: 'process',
          include: processLaneGlobs(),
          poolOptions: { forks: { singleFork: true } },
          sequence: { groupOrder: PROCESS_GROUP_ORDER },
        },
      },
    ],
  },
});
