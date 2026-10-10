import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { runClaudeStatuslineBridge } from '../../src/infrastructure/harnesses/claude-code/statusline-bridge.js';
import { renderFallbackLine } from '../../src/infrastructure/harnesses/claude-code/statusline-output.js';
import { runPreviousStatusline } from '../../src/infrastructure/harnesses/claude-code/statusline-previous.js';
import { resolveStatuslineShell } from '../../src/infrastructure/harnesses/claude-code/statusline-shell.js';
import { STATUSLINE_STATE_FILE } from '../../src/infrastructure/harnesses/claude-code/statusline-state.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';

const FIXTURE = resolve('tests/fixtures/harnesses/claude-code/statusline.json');
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'abc123', agentId: null };
const clock = { now: () => new Date() };
// Above a cold PowerShell start on this machine, below the 20 s the timing-out fixture sleeps.
const SHORT_LIMIT = 8000;

let root = '';
let payload = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-statusline-previous-'));
  payload = await readFile(FIXTURE, 'utf8');
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function usePrevious(command: string | null): Promise<void> {
  await mkdir(join(root, '.context-brake', 'runtime'), { recursive: true });
  const state = { v: 1, installedCommand: 'node "x"', previousLocal: null, previousSource: command === null ? null : 'user', previousCommand: command, createdLocalFile: true };
  await writeFile(join(root, STATUSLINE_STATE_FILE), JSON.stringify(state), 'utf8');
}
async function bridge(argv: readonly string[] = ['node', 'bridge']): Promise<string> {
  const stdout = new PassThrough();
  const chunks: Buffer[] = [];
  stdout.on('data', (chunk: Buffer) => { chunks.push(chunk); });
  const code = await runClaudeStatuslineBridge({ argv, stdin: Readable.from([Buffer.from(payload)]), stdout, resolveProjectRoot: async () => root, previousTimeoutMilliseconds: SHORT_LIMIT });
  expect(code).toBe(0);
  return Buffer.concat(chunks).toString('utf8');
}
async function shellExitCode(command: string): Promise<number | null> {
  const shell = await resolveStatuslineShell(command);
  return new Promise((resolvePromise) => {
    const child = spawn(shell.executables[0] ?? '', [...shell.args], { stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true });
    child.on('error', () => resolvePromise(null));
    child.on('close', (code) => resolvePromise(code));
    child.stdin.end(payload);
  });
}

describe('bridge runs the previous status line (FR-02, DEC-03, DEC-06, TC-04)', () => {
  it('prints the previous output and records the shell that ran it', async () => {
    await usePrevious(`node -e "process.stdout.write('ok')"`);
    expect(await bridge()).toBe('ok');
    const [line] = await new NodeSessionLedger(root, clock).readLines(KEY);
    expect(line).toMatchObject({ type: 'statusline', windowTokens: 200000, shell: expect.stringMatching(/^(sh|git-bash|powershell)$/) as unknown });
  });
  it('prints nothing and records without a previous status line', async () => {
    await usePrevious(null);
    expect(await bridge()).toBe('');
    expect(await new NodeSessionLedger(root, clock).readLines(KEY)).toEqual([expect.not.objectContaining({ shell: expect.anything() as unknown })]);
  });
});

describe('bridge fallback line (FR-03, DEC-04, TC-04)', () => {
  it.each([
    ['exit 1', `node -e "process.exit(1)"`],
    ['no output', `node -e "process.exit(0)"`],
    ['timed out', `node -e "setTimeout(()=>{},20000)"`],
  ])('prints one line with the reason %s', async (reason, command) => {
    await usePrevious(command);
    expect(await bridge()).toBe(`ContextBrake 8% · previous status line failed (${reason}) · run context-brake doctor\n`);
  });
  it('uses the latest reading of ContextBrake when the ledger has one', async () => {
    await new NodeSessionLedger(root, clock).appendToolLine(KEY, { toolUseId: 't1', observedCharacters: 0, turn: 3, usedTokens: 96000, windowTokens: 128000, estimatedTokens: 0, source: 'measured', zone: 'CRITICAL', windowOrigin: 'harness' });
    const command = `node -e "process.exit(2)"`;
    await usePrevious(command);
    // PowerShell does not propagate the exit code of a native command, so the reason is the one the shell reports.
    const expected = await shellExitCode(command);
    expect(await bridge()).toBe(`ContextBrake 75% CRITICAL · previous status line failed (exit ${expected}) · run context-brake doctor\n`);
  });
  it('reports a shell that cannot start', async () => {
    const result = await runPreviousStatusline({ shell: { label: 'sh', executables: [join(root, 'missing-shell')], args: ['-c', 'true'] }, stdin: Buffer.from('') });
    expect(result).toEqual({ kind: 'failed', reason: 'not started' });
  });
  it('omits the reading when the only tool reading precedes a reset and the payload has none', () => {
    const tool = { v: 1, type: 'tool', at: 'x', toolUseId: 't1', observedCharacters: 0, turn: 3, usedTokens: 96000, windowTokens: 128000, estimatedTokens: 0, source: 'measured', zone: 'CRITICAL' } as const;
    expect(renderFallbackLine({ reason: 'no output', ledger: [tool, { v: 1, type: 'reset', at: 'x', reason: 'clear' }], payload: null })).toBe('ContextBrake · previous status line failed (no output) · run context-brake doctor\n');
  });
});

describe('bridge with the PRD-09 pipeline (DEC-05, TC-05)', () => {
  it('keeps passing stdin through with --pipe and never runs the recorded command', async () => {
    await usePrevious(`node -e "process.stdout.write('should not run')"`);
    expect(await bridge(['node', 'bridge', '--pipe'])).toBe(payload);
  });
});
