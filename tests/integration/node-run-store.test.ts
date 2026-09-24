import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runSessionLineSchema } from '../../src/core/contracts/run-records.js';
import { NodeRunStore } from '../../src/infrastructure/runner/node-run-store.js';
import { runDirectory, runsDirectory } from '../../src/infrastructure/runner/run-paths.js';
import { runRecordAt, sessionLineAt } from '../helpers/run-records.js';

let projectRoot: string;
function store(): NodeRunStore {
  return new NodeRunStore({ projectRoot, stateFiles: { plan: join(projectRoot, 'task_plan.json'), checkpoint: join(projectRoot, 'state_checkpoint.json') } });
}
function startedAt(minute: number): string {
  return new Date(Date.UTC(2020, 0, 1, 10, minute)).toISOString();
}

beforeEach(async () => { projectRoot = await mkdtemp(join(tmpdir(), 'cb-t05-store-')); });
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('run records (TC-12, RF17, DEC-14)', () => {
  it('writes run.json with LF endings and reads it back', async () => {
    const record = runRecordAt('run-a', startedAt(0));
    await store().writeRecord(record);
    expect(await store().readRecord('run-a')).toEqual(record);
    const source = await readFile(join(runDirectory(projectRoot, 'run-a'), 'run.json'), 'utf8');
    expect(source.endsWith('}\n')).toBe(true);
    expect(source).not.toContain('\r');
  });

  it('reads a missing, invalid, or unsafe run as null', async () => {
    await mkdir(runDirectory(projectRoot, 'run-bad'), { recursive: true });
    await writeFile(join(runDirectory(projectRoot, 'run-bad'), 'run.json'), '{"v":1', 'utf8');
    expect(await store().readRecord('run-missing')).toBeNull();
    expect(await store().readRecord('run-bad')).toBeNull();
    expect(await store().readRecord('../escape')).toBeNull();
  });

  it('refuses to write a record whose run id is not a directory name', async () => {
    await expect(store().writeRecord(runRecordAt('../escape', startedAt(0)))).rejects.toThrow(RangeError);
  });

  it('places the runner directory under the git-ignored runtime directory', async () => {
    await store().writeRecord(runRecordAt('run-a', startedAt(0)));
    expect(await readFile(join(projectRoot, '.context-brake', 'runtime', '.gitignore'), 'utf8')).toBe('*\n');
  });
});

describe('session lines (TC-12, RF17, CA-13)', () => {
  it('appends one schema-valid line per session with no content fields', async () => {
    await store().appendSession('run-a', sessionLineAt(1));
    await store().appendSession('run-a', sessionLineAt(2));
    const lines = (await readFile(join(runDirectory(projectRoot, 'run-a'), 'sessions.jsonl'), 'utf8')).split('\n');
    expect(lines.at(-1)).toBe('');
    const parsed = lines.slice(0, -1).map((line) => runSessionLineSchema.parse(JSON.parse(line)));
    expect(parsed.map((line) => line.index)).toEqual([1, 2]);
    expect(lines.join('\n')).not.toMatch(/prompt|response|outputTail|finalText/);
  });

  it('rejects a line with a content field without writing it', async () => {
    const line = { ...sessionLineAt(1), prompt: 'secret' };
    await expect(store().appendSession('run-a', line)).rejects.toThrow();
    await expect(readdir(runsDirectory(projectRoot))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('latest run and retention (TC-12, DEC-14)', () => {
  it('finds the run with the latest start, ignoring directory names', async () => {
    await store().writeRecord(runRecordAt('run-z', startedAt(1)));
    await store().writeRecord(runRecordAt('run-a', startedAt(5)));
    expect(await store().latestRunId()).toBe('run-a');
  });

  it('reports no latest run before any run exists', async () => {
    expect(await store().latestRunId()).toBeNull();
    expect(await store().pruneRuns()).toBe(0);
  });

  it('prunes the oldest runs so the next run makes 20', async () => {
    for (let minute = 0; minute < 25; minute += 1) await store().writeRecord(runRecordAt(`run-${String(minute).padStart(2, '0')}`, startedAt(minute)));
    await mkdir(join(runsDirectory(projectRoot), 'run-unrecorded'));
    expect(await store().pruneRuns()).toBe(7);
    const remaining = (await readdir(runsDirectory(projectRoot))).sort();
    expect(remaining).toHaveLength(19);
    expect(remaining[0]).toBe('run-07');
    expect(remaining).toContain('run-unrecorded');
    await store().writeRecord(runRecordAt('run-new', startedAt(30)));
    expect(await readdir(runsDirectory(projectRoot))).toHaveLength(20);
  });
});
