import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { versionFromProcess } from '../../src/core/services/version-service.js';
import { NodeProcessRunner } from '../../src/infrastructure/process/node-process-runner.js';

const fixtureRoot = resolve('tests', 'fixtures', 'harnesses', 'version-probe');
const versionFixture = join(fixtureRoot, 'version-fixture.mjs');
const treeFixture = join(fixtureRoot, 'process-tree-parent.mjs');
const runner = new NodeProcessRunner();

describe('Node version process probe execution (IT-13, CA-16)', () => {
  it.each([
    { mode: 'old', status: 'old', normalized: '1.4.0' },
    { mode: 'prerelease', status: 'old', normalized: '2.0.0-beta.2' },
    { mode: 'current', status: 'resolved', normalized: '2.0.0' },
    { mode: 'malformed', status: 'malformed', normalized: null },
  ] as const)('normalizes the $mode fixture', async ({ mode, status, normalized }) => {
    const result = await runner.run({ executable: process.execPath, args: [versionFixture, mode], timeoutMilliseconds: 2_000 });
    expect(result.status).toBe('completed');
    expect(versionFromProcess({ result, minimumVersion: '2.0.0' })).toMatchObject({ status, normalized });
  });

  it('returns a bounded timeout state', async () => {
    const result = await runner.run({ executable: process.execPath, args: [versionFixture, 'timeout'], timeoutMilliseconds: 100 });
    expect(result.status).toBe('timed_out');
    expect(versionFromProcess({ result, minimumVersion: '2.0.0' }).status).toBe('timed_out');
  });

  it('passes metacharacters as one argument without a shell', async () => {
    const value = 'literal; echo not-interpolated && still-one-argument';
    const result = await runner.run({ executable: process.execPath, args: [versionFixture, 'echo', value], timeoutMilliseconds: 2_000 });
    expect(result).toMatchObject({ status: 'completed', exitCode: 0, stdout: value });
  });
});

describe('Node executable discovery and tree termination (IT-13, CA-16)', () => {
  it('discovers executables with deduplicated argument-array probes', async () => {
    const missing = 'context-brake-definitely-missing-executable';
    const results = await runner.discover({ names: [process.execPath, process.execPath, missing], timeoutMilliseconds: 2_000 });
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ name: process.execPath, timedOut: false });
    expect(results[0]?.path).not.toBeNull();
    expect(results[1]).toEqual({ name: missing, path: null, timedOut: false });
  });

  it('stops descendants when the parent times out', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'context-brake-process-'));
    const markerPath = join(directory, 'descendant-finished');
    const readyPath = join(directory, 'descendant-started');
    try {
      const result = await runner.run({ executable: process.execPath, args: [treeFixture, markerPath, readyPath], timeoutMilliseconds: 1_000 });
      expect(result.status).toBe('timed_out');
      await expect(access(readyPath)).resolves.toBeUndefined();
      await delay(800);
      await expect(access(markerPath)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 5_000);

  it('reports spawn failures and rejects invalid timeouts', async () => {
    const failed = await runner.run({ executable: 'context-brake-definitely-missing-executable', args: [], timeoutMilliseconds: 500 });
    expect(failed.status).toBe('failed');
    await expect(runner.run({ executable: process.execPath, args: [], timeoutMilliseconds: 0 })).rejects.toThrow(RangeError);
  });
});
