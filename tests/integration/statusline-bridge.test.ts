import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { runtimeDirectory, sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';
import { installBuiltStatuslineBridge, runPreviousCommand, runStatuslinePipeline } from '../helpers/built-hook.js';

const FIXTURE = resolve('tests/fixtures/harnesses/claude-code/statusline.json');
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'abc123', agentId: null };
const PIPE = ['--pipe'];
const PREVIOUS = ['-e', "const c=[];process.stdin.on('data',(d)=>c.push(d));process.stdin.on('end',()=>{const h=require('crypto').createHash('sha256').update(Buffer.concat(c)).digest('hex');process.stdout.write('\\x1b[32mline one\\x1b[0m\\n'+h+'\\n');process.exitCode=3;});"];
const MEBIBYTE = 1024 * 1024;
const clock = { now: () => new Date() };

let projectRoot = '';
let bridgePath = '';
let payload = '';

async function ledgerLines(): Promise<readonly unknown[]> {
  return new NodeSessionLedger(projectRoot, clock).readLines(KEY);
}
async function errorsLog(): Promise<string> {
  return readFile(join(runtimeDirectory(projectRoot), 'errors.jsonl'), 'utf8').catch(() => '');
}

beforeEach(async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'cb-statusline-bridge-'));
  bridgePath = await installBuiltStatuslineBridge(projectRoot);
  payload = await readFile(FIXTURE, 'utf8');
});
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('status line bridge pass-through (FR-02, OBJ-02, DEC-03, TC-06, TC-07)', () => {
  it('passes stdin to the previous command so its output and exit code are unchanged, and records one line', async () => {
    const alone = await runPreviousCommand(PREVIOUS, payload);
    const piped = await runStatuslinePipeline(bridgePath, { bridgeArgs: PIPE, previousArgs: PREVIOUS, stdin: payload });
    expect(alone.stdout.toString()).toContain('\x1b[32mline one\x1b[0m\n');
    expect(piped.stdout.equals(alone.stdout)).toBe(true);
    expect(piped.code).toBe(3);
    expect(piped.bridgeCode).toBe(0);
    expect(await ledgerLines()).toEqual([expect.objectContaining({ type: 'statusline', windowTokens: 200000, inputTokens: 15500, usedPercentage: 8, model: 'claude-opus-5-5' })]);
  });

  it('prints nothing without --pipe, exits 0, and records the line', async () => {
    const result = await runStatuslinePipeline(bridgePath, { bridgeArgs: [], previousArgs: null, stdin: payload });
    expect(result.stdout.length).toBe(0);
    expect(result.code).toBe(0);
    expect(await ledgerLines()).toHaveLength(1);
  });
});

describe('status line bridge resilience (NFR-02, TC-08)', () => {
  it.each([
    ['invalid JSON', () => 'not json {{{'],
    ['a missing session_id', () => JSON.stringify({ ...JSON.parse(payload) as object, session_id: undefined })],
    ['stdin above 1 MiB', () => payload.replace('{', `{${' '.repeat(MEBIBYTE)}`)],
  ])('keeps the output unchanged and records nothing for %s', async (_case, stdinFor) => {
    const stdin = stdinFor();
    const alone = await runPreviousCommand(PREVIOUS, stdin);
    const piped = await runStatuslinePipeline(bridgePath, { bridgeArgs: PIPE, previousArgs: PREVIOUS, stdin });
    expect(piped.stdout.equals(alone.stdout)).toBe(true);
    expect(piped.bridgeCode).toBe(0);
    expect(await ledgerLines()).toEqual([]);
    expect(await errorsLog()).toBe('');
  });

  it('logs an unwritable ledger under the StatusLine event and still passes the output through', async () => {
    await mkdir(join(runtimeDirectory(projectRoot), 'sessions'), { recursive: true });
    await writeFile(join(runtimeDirectory(projectRoot), 'sessions', 'claude-code'), 'not a directory');
    const alone = await runPreviousCommand(PREVIOUS, payload);
    const piped = await runStatuslinePipeline(bridgePath, { bridgeArgs: PIPE, previousArgs: PREVIOUS, stdin: payload });
    expect(piped.stdout.equals(alone.stdout)).toBe(true);
    expect(piped.bridgeCode).toBe(0);
    const [line] = (await errorsLog()).trimEnd().split('\n').map((text) => JSON.parse(text) as unknown);
    expect(line).toMatchObject({ harness: 'claude-code', event: 'StatusLine', code: 'UNEXPECTED' });
  });
});

describe('status line bridge privacy (NFR-03, TC-09)', () => {
  it('stores only the five values and the time, never cost, workspace, or output', async () => {
    await runStatuslinePipeline(bridgePath, { bridgeArgs: PIPE, previousArgs: PREVIOUS, stdin: payload });
    const [line] = await ledgerLines();
    expect(Object.keys(line as object).sort()).toEqual(['at', 'inputTokens', 'model', 'type', 'usedPercentage', 'v', 'windowTokens']);
    const content = await readFile(sessionLedgerPath(projectRoot, KEY), 'utf8');
    for (const secret of ['total_cost_usd', '0.01234', '/original/project/directory', 'transcript', 'line one']) expect(content).not.toContain(secret);
  });
});
