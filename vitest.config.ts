import { configDefaults, defineConfig, type TestProjectInlineConfiguration, type ViteUserConfig } from 'vitest/config';
import { processLaneGlobs, TEST_FILE_PATTERN, SERIAL_LANE_FILES } from './tests/test-lanes.js';
import { BENCH_FILE_PATTERN } from './vitest.bench.config.js';

const GLOBAL_TIMEOUT_MS = 30000;
const PARALLEL_GROUP_ORDER = 0;
const PROCESS_GROUP_ORDER = 1;
const SERIAL_GROUP_ORDER = 2;
const MAX_WORKERS = 6;

type LaneOptions = NonNullable<TestProjectInlineConfiguration['test']>;

function lane(options: LaneOptions): TestProjectInlineConfiguration {
  return { test: { testTimeout: GLOBAL_TIMEOUT_MS, ...options } };
}

function lanes(): TestProjectInlineConfiguration[] {
  return [
    lane({
      name: 'parallel',
      include: [TEST_FILE_PATTERN],
      exclude: [...configDefaults.exclude, BENCH_FILE_PATTERN, ...processLaneGlobs(), ...SERIAL_LANE_FILES],
      sequence: { groupOrder: PARALLEL_GROUP_ORDER },
    }),
    lane({
      name: 'process',
      include: processLaneGlobs(),
      exclude: [...configDefaults.exclude, ...SERIAL_LANE_FILES],
      sequence: { groupOrder: PROCESS_GROUP_ORDER },
    }),
    lane({
      name: 'serial',
      include: [...SERIAL_LANE_FILES],
      poolOptions: { forks: { singleFork: true } },
      sequence: { groupOrder: SERIAL_GROUP_ORDER },
    }),
  ];
}

export function testConfig(): ViteUserConfig {
  return {
    test: {
      maxWorkers: MAX_WORKERS,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
        exclude: [],
      },
      projects: lanes(),
    },
  };
}

export default defineConfig(() => testConfig());
