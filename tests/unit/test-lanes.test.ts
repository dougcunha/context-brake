import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { TEST_MODE_VARIABLE, testConfig } from '../../vitest.config.js';
import { hasProcessMarker, isProcessLaneFile, isSerialLaneFile, PROCESS_LANE_DIRECTORIES, PROCESS_LANE_FILES, processLaneGlobs, TEST_FILE_PATTERN, TEST_FILE_SUFFIX, SERIAL_LANE_FILES } from '../test-lanes.js';

const TEST_ROOT = 'tests';
const LANES = ['parallel', 'process', 'serial'] as const;
const GLOBAL_TIMEOUT_MS = 30000;
const MAX_WORKERS = 2;
const ACCEPTANCE_MODE = 'acceptance';
const config = testConfig('test');

type Lane = (typeof LANES)[number];
type LaneProject = {
  test?: {
    name?: string;
    include?: string[];
    exclude?: string[];
    testTimeout?: number;
    env?: Record<string, string>;
    poolOptions?: { forks?: { singleFork?: boolean } };
    sequence?: { groupOrder?: number };
  };
};

async function listTestFiles(): Promise<string[]> {
  const entries = await readdir(TEST_ROOT, { recursive: true });
  const files = entries.map((entry) => `${TEST_ROOT}/${entry.replaceAll('\\', '/')}`);
  return files.filter((file) => file.endsWith(TEST_FILE_SUFFIX)).sort();
}

function laneProject(name: Lane, mode = 'test'): LaneProject['test'] {
  const projects = (testConfig(mode).test?.projects ?? []) as unknown as LaneProject[];
  return projects.find((project) => project.test?.name === name)?.test;
}

describe('T23/CR-01: process-heavy test files leave the parallel lane', () => {
  it('assigns every test file with a process marker to the process or serial lane', async () => {
    const files = await listTestFiles();
    const sources = await Promise.all(files.map(async (file) => ({ file, source: await readFile(file, 'utf8') })));
    const misplaced = sources.filter(({ file, source }) => hasProcessMarker(source) && !isProcessLaneFile(file) && !isSerialLaneFile(file));
    expect(misplaced.map(({ file }) => file)).toEqual([]);
  });

  it('matches existing test files with every process and serial lane entry', async () => {
    const files = await listTestFiles();
    for (const directory of PROCESS_LANE_DIRECTORIES) expect(files.some((file) => file.startsWith(directory))).toBe(true);
    for (const laneFile of [...PROCESS_LANE_FILES, ...SERIAL_LANE_FILES]) expect(files).toContain(laneFile);
  });
});

describe('T23/CR-01: the Vitest configuration wires the three lanes', () => {
  it('runs the lanes in order: parallel, bounded process, then serial', () => {
    const orders = LANES.map((name) => laneProject(name)?.sequence?.groupOrder ?? -1);
    expect(orders).toEqual([...orders].sort((left, right) => left - right));
    expect(new Set(orders).size).toBe(LANES.length);
    expect(config.test?.maxWorkers).toBe(MAX_WORKERS);
  });

  it('runs process lane files in parallel forks and serial lane files alone in a single fork', () => {
    expect(laneProject('process')?.include).toEqual(processLaneGlobs());
    expect(laneProject('process')?.exclude).toEqual(expect.arrayContaining([...SERIAL_LANE_FILES]));
    expect(laneProject('process')?.poolOptions?.forks?.singleFork).toBeUndefined();
    expect(laneProject('serial')?.include).toEqual([...SERIAL_LANE_FILES]);
    expect(laneProject('serial')?.poolOptions?.forks?.singleFork).toBe(true);
  });

  it('keeps process and serial files out of the parallel lane', () => {
    expect(laneProject('parallel')?.include).toEqual([TEST_FILE_PATTERN]);
    expect(laneProject('parallel')?.exclude).toEqual(expect.arrayContaining([...processLaneGlobs(), ...SERIAL_LANE_FILES]));
  });

  it('gives every lane the global timeout and the Vitest mode', () => {
    for (const name of LANES) {
      expect(laneProject(name)?.testTimeout).toBe(GLOBAL_TIMEOUT_MS);
      expect(laneProject(name, ACCEPTANCE_MODE)?.env?.[TEST_MODE_VARIABLE]).toBe(ACCEPTANCE_MODE);
    }
  });
});
