import { configDefaults, defineConfig, type TestProjectInlineConfiguration, type ViteUserConfig } from 'vitest/config';
import { processLaneGlobs, TEST_FILE_PATTERN, SERIAL_LANE_FILES } from './tests/test-lanes.js';

const GLOBAL_TIMEOUT_MS = 30000;
const PARALLEL_GROUP_ORDER = 0;
const PROCESS_GROUP_ORDER = 1;
const SERIAL_GROUP_ORDER = 2;
const MAX_WORKERS = 2;
export const TEST_MODE_VARIABLE = 'CONTEXT_BRAKE_TEST_MODE';

type LaneOptions = NonNullable<TestProjectInlineConfiguration['test']>;

function lane(mode: string, options: LaneOptions): TestProjectInlineConfiguration {
  return { test: { testTimeout: GLOBAL_TIMEOUT_MS, env: { [TEST_MODE_VARIABLE]: mode }, ...options } };
}

function lanes(mode: string): TestProjectInlineConfiguration[] {
  return [
    lane(mode, {
      name: 'parallel',
      include: [TEST_FILE_PATTERN],
      exclude: [...configDefaults.exclude, ...processLaneGlobs(), ...SERIAL_LANE_FILES],
      sequence: { groupOrder: PARALLEL_GROUP_ORDER },
    }),
    lane(mode, {
      name: 'process',
      include: processLaneGlobs(),
      exclude: [...configDefaults.exclude, ...SERIAL_LANE_FILES],
      sequence: { groupOrder: PROCESS_GROUP_ORDER },
    }),
    lane(mode, {
      name: 'serial',
      include: [...SERIAL_LANE_FILES],
      poolOptions: { forks: { singleFork: true } },
      sequence: { groupOrder: SERIAL_GROUP_ORDER },
    }),
  ];
}

export function testConfig(mode: string): ViteUserConfig {
  return {
    test: {
      maxWorkers: MAX_WORKERS,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
        exclude: [],
      },
      projects: lanes(mode),
    },
  };
}

export default defineConfig(({ mode }) => testConfig(mode));
