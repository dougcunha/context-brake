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

let root = '';
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-hook-deadline-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
}
async function slowStdin(): Promise<string> {
  await sleep(50);
  return '{}';
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
async function runHook(eventName: string, inputDelay: number): Promise<{ readonly stderr: string[] }> {
  const stderr: string[] = [];
  const context: ProcessHookContext = { argv: ['node', 'hook', eventName], readStdin: async () => '{}', writeStdout: () => undefined, writeStderr: (text) => { stderr.push(text); }, deadlineMilliseconds: EVENT_LIMIT, sessionStartDeadlineMilliseconds: SESSION_START_LIMIT };
  await runProcessHook(slowAdapter(inputDelay), context);
  return { stderr };
}
async function errorLines(): Promise<unknown[]> {
  const text = await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8').catch(() => '');
  return text.split('\n').filter((line) => line !== '').map((line) => JSON.parse(line) as unknown);
}

describe('session start deadline (FR-10, DEC-11, TC-15)', () => {
  it('uses 1,500 ms for events and 5,000 ms for session start by default', () => {
    expect(DEFAULT_DEADLINE_LIMITS).toEqual({ event: INTERNAL_DEADLINE_MILLISECONDS, sessionStart: SESSION_START_DEADLINE_MILLISECONDS });
    expect(SESSION_START_DEADLINE_MILLISECONDS).toBe(5000);
    expect(defaultProcessHookContext.deadlineMilliseconds).toBe(1500);
    expect(defaultProcessHookContext.sessionStartDeadlineMilliseconds).toBe(5000);
  });
  it('lets a session start finish past the event deadline but within its own', async () => {
    const { stderr } = await runHook('SessionStart', WITHIN_SESSION_START);
    expect(stderr).toEqual([]);
    expect(await errorLines()).toEqual([]);
  });
  it('records DEADLINE_EXCEEDED when a session start passes its own deadline', async () => {
    const { stderr } = await runHook('SessionStart', BEYOND_SESSION_START);
    expect(stderr[0]).toContain('DEADLINE_EXCEEDED');
    expect(await errorLines()).toHaveLength(1);
  });
  it('keeps the event deadline for a tool call of the same duration', async () => {
    const { stderr } = await runHook('PostToolUse', WITHIN_SESSION_START);
    expect(stderr[0]).toContain('DEADLINE_EXCEEDED');
  });
});

describe('deadline phase record (FR-11, DEC-12, TC-16)', () => {
  it('names the running phase and the elapsed milliseconds', async () => {
    await runHook('SessionStart', BEYOND_SESSION_START);
    const [line] = await errorLines();
    const record = errorLineSchema.parse(line);
    expect(record).toMatchObject({ event: 'session_reset', code: 'DEADLINE_EXCEEDED', phase: 'input' });
    expect(record.elapsedMs).toBeGreaterThanOrEqual(SESSION_START_LIMIT - 5);
  });
  it('names the phase of a failure before the event is known', async () => {
    const stderr: string[] = [];
    const context: ProcessHookContext = { argv: ['node', 'hook', 'PostToolUse'], readStdin: slowStdin, writeStdout: () => undefined, writeStderr: (text) => { stderr.push(text); }, deadlineMilliseconds: 5 };
    await runProcessHook(slowAdapter(0), context);
    expect(errorLineSchema.parse((await errorLines())[0])).toMatchObject({ event: 'PostToolUse', phase: 'stdin' });
  });
});
