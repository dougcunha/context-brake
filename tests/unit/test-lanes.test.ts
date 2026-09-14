import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import config from '../../vitest.config.js';
import { hasProcessMarker, isProcessLaneFile, PROCESS_LANE_DIRECTORIES, PROCESS_LANE_FILES, processLaneGlobs, TEST_FILE_PATTERN, TEST_FILE_SUFFIX } from '../test-lanes.js';

const TEST_ROOT = 'tests';
const PARALLEL_LANE = 'parallel';
const PROCESS_LANE = 'process';
const GLOBAL_TIMEOUT_MS = 30000;

type LaneProject = {
  extends?: boolean | string;
  test?: {
    name?: string;
    include?: string[];
    exclude?: string[];
    poolOptions?: { forks?: { singleFork?: boolean } };
    sequence?: { groupOrder?: number };
  };
};

async function listTestFiles(): Promise<string[]> {
  const entries = await readdir(TEST_ROOT, { recursive: true });
  const files = entries.map((entry) => `${TEST_ROOT}/${entry.replaceAll('\\', '/')}`);
  return files.filter((file) => file.endsWith(TEST_FILE_SUFFIX)).sort();
}

function laneProject(name: string): LaneProject | undefined {
  const projects = (config.test?.projects ?? []) as unknown as LaneProject[];
  return projects.find((project) => project.test?.name === name);
}

describe('T23/CR-01: process-heavy test files belong to the process lane', () => {
  it('assigns every test file with a process marker to the process lane', async () => {
    const files = await listTestFiles();
    const sources = await Promise.all(files.map(async (file) => ({ file, source: await readFile(file, 'utf8') })));
    const misplaced = sources.filter(({ file, source }) => hasProcessMarker(source) && !isProcessLaneFile(file));
    expect(misplaced.map(({ file }) => file)).toEqual([]);
  });

  it('matches existing test files with every process lane entry', async () => {
    const files = await listTestFiles();
    for (const directory of PROCESS_LANE_DIRECTORIES) expect(files.some((file) => file.startsWith(directory))).toBe(true);
    for (const laneFile of PROCESS_LANE_FILES) expect(files).toContain(laneFile);
  });
});

describe('T23/CR-01: the Vitest configuration wires both lanes', () => {
  it('runs the process lane in a single fork after the parallel lane', () => {
    const processLane = laneProject(PROCESS_LANE);
    const parallelOrder = laneProject(PARALLEL_LANE)?.test?.sequence?.groupOrder ?? 0;
    expect(processLane?.extends).toBe(true);
    expect(processLane?.test?.include).toEqual(processLaneGlobs());
    expect(processLane?.test?.poolOptions?.forks?.singleFork).toBe(true);
    expect(processLane?.test?.sequence?.groupOrder).toBeGreaterThan(parallelOrder);
  });

  it('keeps process lane files out of the parallel lane and preserves the global timeout', () => {
    const parallelLane = laneProject(PARALLEL_LANE);
    expect(config.test?.include).toBeUndefined();
    expect(parallelLane?.extends).toBe(true);
    expect(parallelLane?.test?.include).toEqual([TEST_FILE_PATTERN]);
    expect(parallelLane?.test?.exclude).toEqual(expect.arrayContaining(processLaneGlobs()));
    expect(config.test?.testTimeout).toBe(GLOBAL_TIMEOUT_MS);
  });
});
