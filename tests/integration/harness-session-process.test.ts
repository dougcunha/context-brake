import { access, readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionLauncher } from '../../src/core/contracts/run-ports.js';
import { ClaudeSessionLauncher } from '../../src/infrastructure/harnesses/claude-code/session-launcher.js';
import { CodexSessionLauncher } from '../../src/infrastructure/harnesses/codex-cli/session-launcher.js';
import { createFakeWorld, FAKE_PROMPT, removeFakeWorld, startFakeSession, type FakeWorld } from '../helpers/fake-session.js';

let world: FakeWorld;
beforeEach(async () => { world = await createFakeWorld('cb-t07-session-'); });
afterEach(async () => { await removeFakeWorld(world); });

describe('harness session process streams (TC-14, TC-15, DEC-01, DEC-22)', () => {
  it('delivers the prompt on stdin, passes the run id, and streams Claude Code events', async () => {
    const record = join(world.root, 'record.json');
    const scenario = { record, sessionId: 'claude-1', tokens: 2000, noise: ['garbage'] };
    const started = await startFakeSession(world, { launcher: new ClaudeSessionLauncher(), scenario, harnessArgs: ['--permission-mode', 'acceptEdits'] });
    expect(await started.exit).toEqual({ exitCode: 0, spawnFailed: false, unparsedLines: 1 });
    expect(started.events).toEqual([{ kind: 'started', sessionId: 'claude-1' }, { kind: 'usage', tokens: 2000 }, { kind: 'final_text', text: '[REQUEST_SESSION_RESET]' }]);
    const recorded = JSON.parse(await readFile(record, 'utf8')) as Record<string, unknown>;
    expect(recorded).toMatchObject({ harness: 'claude', argv: ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits'], stdin: FAKE_PROMPT, runId: 'run-t07' });
    expect(await realpath(String(recorded['cwd']))).toBe(world.root);
  }, 20_000);

  it('reports a Codex CLI turn failure and its non-zero exit, and ignores a late stop', async () => {
    const record = join(world.root, 'record.json');
    const started = await startFakeSession(world, { launcher: new CodexSessionLauncher(), scenario: { record, sessionId: 'thread-1', failure: 'unexpected status 401' } });
    expect(await started.exit).toEqual({ exitCode: 1, spawnFailed: false, unparsedLines: 0 });
    expect(started.events).toEqual([{ kind: 'started', sessionId: 'thread-1' }, { kind: 'failed', detail: 'unexpected status 401' }]);
    expect(JSON.parse(await readFile(record, 'utf8'))).toMatchObject({ harness: 'codex', argv: ['exec', '--json', '-'], stdin: FAKE_PROMPT });
    await expect(started.stop()).resolves.toBeUndefined();
  }, 20_000);
});

describe('harness session process launch failures (TC-15, DEC-04)', () => {
  it('reports a spawn failure when the executable is missing', async () => {
    const claude = new ClaudeSessionLauncher();
    const missing: SessionLauncher = { harness: claude.harness, executableNames: ['cb-t07-missing'], parseLine: () => [], buildCommand: () => ({ executable: 'cb-t07-missing', args: [], stdin: '' }) };
    const started = await startFakeSession(world, { launcher: missing, scenario: {} });
    expect(await started.exit).toEqual({ exitCode: null, spawnFailed: true, unparsedLines: 0 });
    await expect(started.stop()).resolves.toBeUndefined();
  }, 20_000);

  it('rejects a forbidden character for a Windows shim before spawning anything', async (ctx) => {
    if (process.platform !== 'win32') ctx.skip('Windows command shims exist only on win32; POSIX spawns without a shell.');
    const record = join(world.root, 'record.json');
    const started = await startFakeSession(world, { launcher: new ClaudeSessionLauncher(), scenario: { record }, harnessArgs: ['--append-system-prompt', 'a&b'] });
    expect(await started.exit).toEqual({ exitCode: null, spawnFailed: true, unparsedLines: 0 });
    await expect(access(record)).rejects.toMatchObject({ code: 'ENOENT' });
  }, 20_000);
});
