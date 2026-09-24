import { access, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OUTPUT_TAIL_BYTES, ShellValidationExecutor } from '../../src/infrastructure/runner/shell-validation-executor.js';

const commandFixture = resolve('tests', 'fixtures', 'runner', 'validation-command.mjs');
const treeFixture = resolve('tests', 'fixtures', 'harnesses', 'version-probe', 'process-tree-parent.mjs');

function quoted(...parts: readonly string[]): string {
  return parts.map((part) => `"${part}"`).join(' ');
}

function node(...args: readonly string[]): string {
  return quoted(process.execPath, ...args);
}

let projectRoot: string;
beforeEach(async () => { projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'cb-t05-validation-'))); });
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('shell validation executor outcomes (TC-11, RF10, DEC-11)', () => {
  it('reports a zero exit as passed and runs in the project root', async () => {
    const outcome = await new ShellValidationExecutor(projectRoot).start({ command: node(commandFixture, 'cwd'), timeoutMilliseconds: 10_000 }).outcome;
    expect(outcome).toMatchObject({ status: 'passed', exitCode: 0 });
    expect(await realpath(outcome.outputTail.trim())).toBe(projectRoot);
  });

  it('captures a non-zero exit code and the combined output tail, and ignores a late stop', async () => {
    const running = new ShellValidationExecutor(projectRoot).start({ command: node(commandFixture, 'exit', '3'), timeoutMilliseconds: 10_000 });
    const outcome = await running.outcome;
    expect(outcome).toMatchObject({ status: 'failed', exitCode: 3 });
    expect(outcome.outputTail).toContain('stdout:3');
    await expect(running.stop()).resolves.toBeUndefined();
    expect(outcome.outputTail).toContain('stderr:line');
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('runs shell pipes written in the plan', async () => {
    const command = `${node(commandFixture, 'exit', '0')} | ${node(commandFixture, 'relay')}`;
    const outcome = await new ShellValidationExecutor(projectRoot).start({ command, timeoutMilliseconds: 10_000 }).outcome;
    expect(outcome).toMatchObject({ status: 'passed', exitCode: 0 });
    expect(outcome.outputTail).toContain('STDOUT:0');
  });

  it('keeps only the last 16 KiB of output', async () => {
    const outcome = await new ShellValidationExecutor(projectRoot).start({ command: node(commandFixture, 'flood', '40000'), timeoutMilliseconds: 10_000 }).outcome;
    expect(outcome.status).toBe('failed');
    expect(Buffer.byteLength(outcome.outputTail)).toBeLessThanOrEqual(OUTPUT_TAIL_BYTES);
    expect(outcome.outputTail.trimEnd().endsWith('FLOOD-END')).toBe(true);
  });
});

describe('shell validation executor termination (TC-11, CA-07)', () => {
  it('rejects a non-positive timeout before running anything', () => {
    expect(() => new ShellValidationExecutor(projectRoot).start({ command: 'exit 0', timeoutMilliseconds: 0 })).toThrow(RangeError);
  });

  it('reports timed_out after a 1 s timeout and leaves no descendant to finish', async () => {
    const markerPath = join(projectRoot, 'descendant-finished');
    const readyPath = join(projectRoot, 'descendant-started');
    const outcome = await new ShellValidationExecutor(projectRoot).start({ command: node(treeFixture, markerPath, readyPath), timeoutMilliseconds: 1_000 }).outcome;
    expect(outcome).toMatchObject({ status: 'timed_out', exitCode: null });
    expect(outcome.durationMs).toBeGreaterThanOrEqual(990);
    await delay(2_000);
    await expect(access(markerPath)).rejects.toMatchObject({ code: 'ENOENT' });
  }, 10_000);

  it('stops a running validation tree on request', async () => {
    const markerPath = join(projectRoot, 'descendant-finished');
    const readyPath = join(projectRoot, 'descendant-started');
    const running = new ShellValidationExecutor(projectRoot).start({ command: node(treeFixture, markerPath, readyPath), timeoutMilliseconds: 30_000 });
    expect(await waitFor(readyPath)).toBe(true);
    await running.stop();
    await expect(running.outcome).resolves.toMatchObject({ status: 'failed', exitCode: null });
    await delay(1_000);
    await expect(access(markerPath)).rejects.toMatchObject({ code: 'ENOENT' });
  }, 10_000);
});

async function waitFor(filePath: string): Promise<boolean> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await access(filePath).then(() => true, () => false)) return true;
    await delay(50);
  }
  return false;
}
