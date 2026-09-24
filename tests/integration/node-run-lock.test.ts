import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isProcessAlive, NodeRunLock } from '../../src/infrastructure/runner/node-run-lock.js';
import { lockPath, runnerDirectory } from '../../src/infrastructure/runner/run-paths.js';

const DEAD_PID = 999_999;

function alive(pid: number): boolean {
  return pid !== DEAD_PID;
}

let projectRoot: string;
beforeEach(async () => { projectRoot = await mkdtemp(join(tmpdir(), 'cb-t05-lock-')); });
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('run lock (TC-12, CA-09, DEC-13)', () => {
  it('acquires a free lock with the pid and run id, then releases it', async () => {
    const lock = new NodeRunLock(projectRoot, alive);
    expect(await lock.acquire({ pid: 4242, runId: 'run-a' })).toBeNull();
    expect(JSON.parse(await readFile(lockPath(projectRoot), 'utf8'))).toEqual({ pid: 4242, runId: 'run-a' });
    await lock.release();
    await expect(readFile(lockPath(projectRoot), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses a new run while the holder is alive', async () => {
    await new NodeRunLock(projectRoot, alive).acquire({ pid: 4242, runId: 'run-a' });
    const refused = await new NodeRunLock(projectRoot, alive).acquire({ pid: 5151, runId: 'run-b' });
    expect(refused).toEqual({ pid: 4242, runId: 'run-a' });
  });

});

describe('stale run locks (TC-12, DEC-13)', () => {
  it.each([
    ['a dead pid', JSON.stringify({ pid: DEAD_PID, runId: 'run-old' })],
    ['unreadable content', ''],
  ])('replaces a stale lock with %s', async (_case, content) => {
    await mkdir(runnerDirectory(projectRoot), { recursive: true });
    await writeFile(lockPath(projectRoot), content, 'utf8');
    expect(await new NodeRunLock(projectRoot, alive).acquire({ pid: 5151, runId: 'run-b' })).toBeNull();
    expect(JSON.parse(await readFile(lockPath(projectRoot), 'utf8'))).toEqual({ pid: 5151, runId: 'run-b' });
  });

  it('leaves a lock another run took over untouched on release', async () => {
    const lock = new NodeRunLock(projectRoot, alive);
    await lock.acquire({ pid: 4242, runId: 'run-a' });
    await writeFile(lockPath(projectRoot), JSON.stringify({ pid: 5151, runId: 'run-b' }), 'utf8');
    await lock.release();
    await lock.release();
    expect(JSON.parse(await readFile(lockPath(projectRoot), 'utf8'))).toEqual({ pid: 5151, runId: 'run-b' });
  });

  it('probes real processes: this one is alive, an unused pid is not', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
    expect(isProcessAlive(DEAD_PID)).toBe(false);
  });
});
