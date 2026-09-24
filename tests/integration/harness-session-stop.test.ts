import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ExecutableResult, ProcessResult, ProcessRunner } from '../../src/core/contracts/processes.js';
import { ClaudeSessionLauncher } from '../../src/infrastructure/harnesses/claude-code/session-launcher.js';
import { assertHarnessArguments, resolveHarnessExecutable } from '../../src/infrastructure/runner/executable-resolver.js';
import { createFakeWorld, removeFakeWorld, startFakeSession, type FakeWorld } from '../helpers/fake-session.js';

let world: FakeWorld;
beforeEach(async () => { world = await createFakeWorld('cb-t07-stop-'); });
afterEach(async () => { await removeFakeWorld(world); });

async function readPids(pidFile: string): Promise<readonly number[]> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const source = await readFile(pidFile, 'utf8').catch(() => null);
    if (source !== null) return (JSON.parse(source) as { pids: number[] }).pids;
    await delay(100);
  }
  return [];
}

async function waitForReady(readyFile: string): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (await readFile(readyFile, 'utf8').catch(() => null) === 'ready') return;
    await delay(100);
  }
  throw new TypeError('Fake harness grandchild did not become ready.');
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function survivors(pids: readonly number[]): Promise<readonly number[]> {
  for (let attempt = 0; attempt < 50 && pids.some(isAlive); attempt += 1) await delay(100);
  return pids.filter(isAlive);
}

describe('stopping a hung harness (TC-15, DEC-05, RF3)', () => {
  it.each([false, true])('leaves no surviving process when the harness ignores interrupts: %s', async (ignoreInterrupt) => {
    const pidFile = join(world.root, 'pids.json');
    const started = await startFakeSession(world, { launcher: new ClaudeSessionLauncher(), scenario: { hang: { pidFile }, ignoreInterrupt } });
    const pids = await readPids(pidFile);
    expect(pids).toHaveLength(2);
    await started.stop();
    expect(await started.exit).toMatchObject({ spawnFailed: false });
    expect(started.events[0]).toEqual({ kind: 'started', sessionId: 'fake-session-1' });
    expect(await survivors(pids)).toEqual([]);
    await expect(started.stop()).resolves.toBeUndefined();
  }, 30_000);
});

describe('stopping a POSIX harness process group (TC-15, RF12, CA-09, CR-02)', () => {
  it.skipIf(process.platform === 'win32')('kills a grandchild that ignores SIGINT after its leader exits during grace (RF12, CA-09, CR-02)', async () => {
    const pidFile = join(world.root, 'pids.json');
    const readyFile = join(world.root, 'ready');
    const started = await startFakeSession(world, { launcher: new ClaudeSessionLauncher(), scenario: { hang: { pidFile, readyFile, ignoreChildInterrupt: true } } });
    const pids = await readPids(pidFile);
    expect(pids).toHaveLength(2);
    await waitForReady(readyFile);
    await started.stop();
    expect(await survivors(pids)).toEqual([]);
  }, 30_000);

  it.skipIf(process.platform === 'win32')('kills an orphan grandchild when the leader exited before stop (RF12, CA-09, CR-02)', async () => {
    const pidFile = join(world.root, 'pids.json');
    const readyFile = join(world.root, 'ready');
    const started = await startFakeSession(world, { launcher: new ClaudeSessionLauncher(), scenario: { hang: { pidFile, readyFile, ignoreChildInterrupt: true, exitLeader: true } } });
    const pids = await readPids(pidFile);
    expect(pids).toHaveLength(2);
    await waitForReady(readyFile);
    await started.exit;
    await started.stop();
    expect(await survivors(pids)).toEqual([]);
  }, 30_000);
});

describe('Windows shim detection for harness executables (TC-15, DEC-04)', () => {
  const found: ProcessRunner = {
    async discover(): Promise<readonly ExecutableResult[]> { return [{ name: 'claude', path: 'claude', timedOut: false }]; },
    async run(): Promise<ProcessResult> { return { status: 'failed', exitCode: null, stdout: '', stderr: '' }; },
  };

  it('marks an npm .cmd shim and rejects forbidden characters with INVALID_ARGUMENTS', async () => {
    await writeFile(join(world.root, 'claude.cmd'), '@exit /b 0\r\n', 'utf8');
    const host = { platform: 'win32' as const, environment: { Path: world.root, PATHEXT: '.EXE;.CMD', ComSpec: 'cmd.exe' } };
    expect(await resolveHarnessExecutable(['claude'], { processes: found, host })).toEqual({ executable: 'claude', shim: true });
    await expect(assertHarnessArguments('claude', ['--model', 'opus'], host)).resolves.toBeUndefined();
    await expect(assertHarnessArguments('claude', ['--append-system-prompt', '50%'], host)).rejects.toMatchObject({ code: 'INVALID_ARGUMENTS' });
  });
});
