import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../src/core/contracts/runtime.js';
import { errorLineSchema } from '../../src/core/contracts/session-ledger.js';
import { INTERNAL_DEADLINE_MILLISECONDS } from '../../src/core/services/failure-policy.js';
import { DEFAULT_DEADLINE_LIMITS, SESSION_START_DEADLINE_MILLISECONDS } from '../../src/infrastructure/runtime/hook-deadline.js';
import { defaultProcessHookContext, runProcessHook, type ProcessHarnessAdapter, type ProcessHookContext } from '../../src/infrastructure/runtime/process-hook-host.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-deadline', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [{ id: 'session_boot', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const EVENT_LIMIT = 100;
const SESSION_START_LIMIT = 500;
const WITHIN_SESSION_START = 250;
const BEYOND_SESSION_START = 700;
const DEADLINE_LINE = 'ContextBrake: DEADLINE_EXCEEDED\n';

let root = '';
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-hook-deadline-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
}
function eventFor(eventName: string): RuntimeEvent | null {
  if (eventName === 'SessionStart') return { kind: 'session_reset', session: KEY, reason: 'clear' };
  if (eventName === 'PostToolUse') return { kind: 'post_tool', session: KEY, tool: { name: 'Read', category: 'file_read', paths: [], command: null }, toolUseId: null };
  return null;
}
function slowAdapter(inputDelay: number): ProcessHarnessAdapter {
  return {
    descriptor: DESCRIPTOR,
    mapEvent: (eventName) => eventFor(eventName),
    mapInput: async () => { await sleep(inputDelay); return {}; },
    renderDecision: (decision) => JSON.stringify(decision),
    resolveProjectRoot: async () => root,
  };
}
type HookRun = { readonly exitCode: number; readonly stdout: string[]; readonly stderr: string[] };
async function runHook(eventName: string, inputDelay: number, overrides: Partial<ProcessHookContext> = {}): Promise<HookRun> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const context: ProcessHookContext = { argv: ['node', 'hook', eventName], readStdin: async () => '{}', writeStdout: (text) => { stdout.push(text); }, writeStderr: (text) => { stderr.push(text); }, deadlineMilliseconds: EVENT_LIMIT, sessionStartDeadlineMilliseconds: SESSION_START_LIMIT, ...overrides };
  const exitCode = await runProcessHook(slowAdapter(inputDelay), context);
  return { exitCode, stdout, stderr };
}
async function errorRecords(): Promise<ReturnType<typeof errorLineSchema.parse>[]> {
  const text = await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8').catch(() => '');
  return text.split('\n').filter((line) => line !== '').map((line) => errorLineSchema.parse(JSON.parse(line)));
}

describe('session start deadline (FR-10, DEC-11, TC-15)', () => {
  it('uses 1,500 ms for events and 5,000 ms for session start by default', () => {
    expect(DEFAULT_DEADLINE_LIMITS).toEqual({ event: INTERNAL_DEADLINE_MILLISECONDS, sessionStart: SESSION_START_DEADLINE_MILLISECONDS });
    expect(SESSION_START_DEADLINE_MILLISECONDS).toBe(5000);
    expect(defaultProcessHookContext.deadlineMilliseconds).toBe(1500);
    expect(defaultProcessHookContext.sessionStartDeadlineMilliseconds).toBe(5000);
  });
  it.each([
    { eventName: 'SessionStart', stderr: [], records: 0 },
    { eventName: 'PostToolUse', stderr: [DEADLINE_LINE], records: 1 },
  ])('records $records deadline failures for $eventName work past the event deadline but within the session-start deadline', async ({ eventName, stderr, records }) => {
    const run = await runHook(eventName, WITHIN_SESSION_START);
    expect(run.stderr).toEqual(stderr);
    expect(await errorRecords()).toHaveLength(records);
  });
});

describe('deadline phase record (FR-11, DEC-12, TC-16)', () => {
  it('records DEADLINE_EXCEEDED with the running phase and the elapsed milliseconds when a session start passes its own deadline', async () => {
    const run = await runHook('SessionStart', BEYOND_SESSION_START);
    const records = await errorRecords();
    expect(run.stderr).toEqual([DEADLINE_LINE]);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ event: 'session_reset', code: 'DEADLINE_EXCEEDED', phase: 'input' });
    expect(records[0]?.elapsedMs).toBeGreaterThanOrEqual(SESSION_START_LIMIT - 5);
  });
  it('lets the tool call proceed and names the stdin phase when the deadline elapses before the event is known (DEC-09, TC-17)', async () => {
    const run = await runHook('PostToolUse', 0, { readStdin: async () => { await sleep(50); return '{}'; }, deadlineMilliseconds: 5 });
    expect(run).toEqual({ exitCode: 0, stdout: ['{"kind":"neutral"}'], stderr: [DEADLINE_LINE] });
    expect(await errorRecords()).toEqual([expect.objectContaining({ event: 'PostToolUse', code: 'DEADLINE_EXCEEDED', phase: 'stdin' })]);
  });
});
