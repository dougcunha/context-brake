import { PassThrough } from 'node:stream';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { PayloadInvalidError } from '../../src/core/services/failure-policy.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { readStdinUpTo, runProcessHook, type ProcessHarnessAdapter, type ProcessHookContext } from '../../src/infrastructure/runtime/process-hook-host.js';import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [{ id: 'pre_tool_block', state: 'supported' }, { id: 'tool_coverage', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const clock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };
const realSetTimeout = setTimeout;
async function slowStdin(): Promise<string> { await new Promise((resolve) => realSetTimeout(resolve, 50)); return '{}'; }
function toolInput(turn: number, zone: ToolLineInput['zone'] = 'GREEN'): ToolLineInput {
  return { toolUseId: `toolu_${turn}`, observedCharacters: 0, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone };
}
type Captured = { readonly stdout: string[]; readonly stderr: string[]; readonly context: ProcessHookContext };
function capture(argv: string[], overrides: Partial<ProcessHookContext> = {}): Captured {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const context: ProcessHookContext = { argv, readStdin: async () => '{}', writeStdout: (text) => { stdout.push(text); }, writeStderr: (text) => { stderr.push(text); }, deadlineMilliseconds: 1500, ...overrides };
  return { stdout, stderr, context };
}
function adapter(root: string, overrides: Partial<ProcessHarnessAdapter> = {}): ProcessHarnessAdapter {
  return {
    descriptor: DESCRIPTOR,
    mapEvent: (eventName) => (eventName === 'PreToolUse' ? { kind: 'pre_tool', session: KEY, tool: READ } : null),
    mapInput: () => ({}),
    renderDecision: (decision) => JSON.stringify(decision),
    resolveProjectRoot: async () => root,
    ...overrides,
  };
}

describe('process hook host responses (CMP-17, TC-15)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t04-host-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('writes exactly one response for a valid payload and exits zero', async () => {
    const { stdout, stderr, context } = capture(['node', 'hook', 'PreToolUse']);
    expect(await runProcessHook(adapter(root), context)).toBe(0);
    expect(stdout).toHaveLength(1);
    expect(JSON.parse(stdout[0] ?? '{}')).toEqual({ kind: 'neutral' });
    expect(stderr).toEqual([]);
  });
  it('records a payload error and still responds', async () => {
    const { stdout, stderr, context } = capture(['node', 'hook', 'PreToolUse']);
    const failing = adapter(root, { mapEvent: () => { throw new PayloadInvalidError(); } });
    expect(await runProcessHook(failing, context)).toBe(0);
    expect(JSON.parse(stdout[0] ?? '{}')).toEqual({ kind: 'neutral' });
    expect(stderr[0]).toContain('PAYLOAD_INVALID');
  });
  it('stays neutral when the project root cannot be resolved', async () => {
    const { stdout, stderr, context } = capture(['node', 'hook', 'PreToolUse']);
    const failing = adapter(root, { resolveProjectRoot: async () => { throw new Error('boom'); } });
    expect(await runProcessHook(failing, context)).toBe(0);
    expect(JSON.parse(stdout[0] ?? '{}')).toEqual({ kind: 'neutral' });
    expect(stderr[0]).toContain('UNEXPECTED');
  });
});

describe('process hook host failure policy and input (DEC-09, DEC-11, TC-17)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t04-fail-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('denies through the fallback when the configuration is invalid above the ceiling', async () => {
    const ledger = new NodeSessionLedger(root, clock);
    for (let turn = 1; turn <= 12; turn += 1) await ledger.appendToolLine(KEY, toolInput(turn, turn === 12 ? 'CRITICAL' : 'RED'));
    await writeFile(join(root, 'context-brake.config.json'), '{"schemaVersion":1}', 'utf8');
    const { stdout, stderr, context } = capture(['node', 'hook', 'PreToolUse']);
    expect(await runProcessHook(adapter(root), context)).toBe(0);
    expect(JSON.parse(stdout[0] ?? '{}')).toMatchObject({ kind: 'deny', reason: 'integration_failure' });
    expect(stderr[0]).toContain('INVALID_CONFIG');
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('"code":"INVALID_CONFIG"');
  });
  it('records DEADLINE_EXCEEDED when the internal deadline elapses', async () => {
    const { stdout, stderr, context } = capture(['node', 'hook', 'PreToolUse'], { readStdin: slowStdin, deadlineMilliseconds: 5 });
    expect(await runProcessHook(adapter(root), context)).toBe(0);
    expect(JSON.parse(stdout[0] ?? '{}')).toEqual({ kind: 'neutral' });
    expect(stderr[0]).toContain('DEADLINE_EXCEEDED');
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('"code":"DEADLINE_EXCEEDED"');
  });
  it('awaits an asynchronous input mapper that receives the runtime error log (DEC-11)', async () => {
    const { stdout, context } = capture(['node', 'hook', 'PreToolUse']);
    const measuring = adapter(root, { mapInput: async (_event, _payload, errors) => { await errors.append('claude-code', { event: 'PreToolUse', code: 'UNEXPECTED', detail: 'probe' }); return { measured: { tokens: 120000, contextWindow: null } }; } });
    expect(await runProcessHook(measuring, context)).toBe(0);
    expect(JSON.parse(stdout[0] ?? '{}')).toMatchObject({ kind: 'deny', reason: 'critical_ceiling' });
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('"detail":"probe"');
  });
});

describe('process hook host stdin cap (CMP-17, acceptance)', () => {
  it('truncates the payload at the configured maximum', async () => {
    const stream = new PassThrough();
    const collected = readStdinUpTo(stream, 8);
    stream.end('0123456789ABCDEF');
    expect(await collected).toBe('01234567');
  });
});
