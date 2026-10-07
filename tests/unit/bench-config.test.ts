import { readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { testConfig } from '../../vitest.config.js';
import { BENCH_DIRECTORY, BENCH_FILE_PATTERN, benchConfig } from '../../vitest.bench.config.js';

const BENCH_SUITES = [
  'doctor-benchmark.test.ts',
  'e2e-09.test.ts',
  'overhead-measurer.test.ts',
  'runtime-overhead.test.ts',
  'statusline-overhead.test.ts',
  'statusline-previous-overhead.test.ts',
];

type LaneTest = { name?: string; include?: string[]; exclude?: string[] };

function defaultLanes(): LaneTest[] {
  const projects = (testConfig().test?.projects ?? []) as unknown as { test?: LaneTest }[];
  return projects.map((project) => project.test ?? {});
}

describe('benchmarks run only in their own script (prd-13 FR-01, FR-03, DEC-01, TC-03)', () => {
  it('holds exactly the moved timing suites in the bench directory', async () => {
    expect((await readdir(BENCH_DIRECTORY)).sort()).toEqual(BENCH_SUITES);
  });
  it('includes only the bench directory in one fork', () => {
    const test = benchConfig().test;
    expect(test?.include).toEqual([BENCH_FILE_PATTERN]);
    expect(test?.poolOptions?.forks?.singleFork).toBe(true);
  });
  it('keeps every bench suite out of the default lanes', () => {
    const lanes = defaultLanes();
    const parallel = lanes.find((lane) => lane.name === 'parallel');
    expect(parallel?.exclude).toContain(BENCH_FILE_PATTERN);
    const listed = lanes.flatMap((lane) => lane.include ?? []);
    expect(listed.filter((entry) => entry.startsWith(BENCH_DIRECTORY))).toEqual([]);
  });
});
