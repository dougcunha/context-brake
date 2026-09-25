import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { createInProcessRuntime } from '../../src/infrastructure/runtime/in-process-host.js';
import { runtimeDirectory, sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';

const KEY: SessionKey = { harness: 'opencode', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'opencode', capabilities: [{ id: 'pre_tool_block', state: 'supported' }, { id: 'tool_coverage', state: 'unknown', impact: 'coverage unknown' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: null };
const clock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };

function toolInput(turn: number, toolUseId: string | null = `toolu_${turn}`): ToolLineInput {
  return { toolUseId, observedCharacters: 0, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' };
}

describe('in-process host decisions (TC-32, DEC-16)', () => {
  let root: string;
  let runtime: ReturnType<typeof createInProcessRuntime>;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t04-inproc-'));
    runtime = createInProcessRuntime({ projectRoot: root, descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, clock });
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('returns the engine decision without writing to stdout', async () => {
    const ledger = new NodeSessionLedger(root, clock);
    for (let turn = 1; turn <= 12; turn += 1) await ledger.appendToolLine(KEY, { ...toolInput(turn), observedCharacters: 30000 });
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const decision = await runtime.handle({ kind: 'pre_tool', session: KEY, tool: READ });
    expect(decision).toMatchObject({ kind: 'deny', reason: 'critical_ceiling' });
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
  it('keeps the per-session cache coherent across events', async () => {
    const first = await runtime.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_1' });
    expect(first).toEqual({ kind: 'neutral' });
    await runtime.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_2' });
    const lines = await new NodeSessionLedger(root, clock).readLines(KEY);
    expect(lines.filter((line) => line.type === 'tool')).toHaveLength(2);
    expect(lines.at(-1)).toMatchObject({ type: 'tool', turn: 2 });
  });
});

describe('in-process failure fallback (DEC-09, TC-32)', () => {
  let root: string;
  let runtime: ReturnType<typeof createInProcessRuntime>;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t04-ifail-'));
    runtime = createInProcessRuntime({ projectRoot: root, descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, clock });
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('returns the neutral fallback and records an unreadable ledger', async () => {
    await mkdir(sessionLedgerPath(root, KEY), { recursive: true });
    expect(await runtime.handle({ kind: 'pre_tool', session: KEY, tool: READ })).toEqual({ kind: 'neutral' });
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('"code":"LEDGER_UNREADABLE"');
  });
});

describe('in-process cache invalidation (DEC-16)', () => {
  let root: string;
  let runtime: ReturnType<typeof createInProcessRuntime>;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t04-cache-'));
    runtime = createInProcessRuntime({ projectRoot: root, descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, clock });
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('re-reads the ledger after a reset invalidates the cache', async () => {
    await runtime.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_1' });
    await runtime.handle({ kind: 'session_reset', session: KEY, reason: 'compact' });
    await new NodeSessionLedger(root, clock).appendToolLine(KEY, toolInput(5, 'external'));
    await runtime.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_2' });
    const lines = await new NodeSessionLedger(root, clock).readLines(KEY);
    expect(lines.at(-1)).toMatchObject({ type: 'tool', turn: 2, toolUseId: 'toolu_2' });
  });
  it('prunes on a new session through the cached ledger', async () => {
    await runtime.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_1' });
    expect(await runtime.handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'neutral' });
  });
});
