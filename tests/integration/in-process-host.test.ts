import { mkdir, mkdtemp, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, RuntimeEvent, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { createInProcessRuntime } from '../../src/infrastructure/runtime/in-process-host.js';
import { runtimeDirectory, sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';

const KEY: SessionKey = { harness: 'opencode', sessionId: 'session-1', agentId: null };
const SUBAGENT: SessionKey = { ...KEY, agentId: 'sub-1' };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'opencode', capabilities: [{ id: 'context_usage', state: 'unsupported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: null };
const clock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };
const BEYOND_RETENTION = new Date('2026-08-01T00:00:00.000Z');

let root = '';
let runtime: ReturnType<typeof createInProcessRuntime>;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-t04-inproc-'));
  const declared = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, declaredContextWindow: 128000 } };
  runtime = createInProcessRuntime({ projectRoot: root, descriptor: DESCRIPTOR, config: declared, clock });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

function toolInput(turn: number, toolUseId: string | null = `toolu_${turn}`): ToolLineInput {
  return { toolUseId, observedCharacters: 0, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' };
}
function postTool(session: SessionKey, toolUseId: string | null): RuntimeEvent {
  return { kind: 'post_tool', session, tool: READ, toolUseId };
}
async function lineShapes(key: SessionKey): Promise<unknown[]> {
  const lines = await new NodeSessionLedger(root, clock).readLines(key);
  return lines.map((line) => [line.type, 'turn' in line ? line.turn : null]);
}

describe('in-process host decisions (TC-32, DEC-16)', () => {
  it('returns the engine decision for the measured input without writing to stdout', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const decision = await runtime.handle(postTool(KEY, 'toolu_1'), { measured: { tokens: 120000, contextWindow: 128000 } });
    expect(decision).toMatchObject({ kind: 'context', block: expect.stringContaining('tokens=120000/128000 source=measured') as unknown });
    expect(write).not.toHaveBeenCalled();
  });
  it('keeps a write-through cache per session and agent, so a foreign write is unseen until a reset', async () => {
    await runtime.handle(postTool(KEY, 'toolu_1'));
    await new NodeSessionLedger(root, clock).appendToolLine(KEY, toolInput(5, 'external'));
    await runtime.handle(postTool(KEY, 'toolu_2'));
    await runtime.handle(postTool(SUBAGENT, 'toolu_3'));
    expect(await lineShapes(KEY)).toEqual([['session', null], ['tool', 1], ['tool', 5], ['tool', 2]]);
    expect(await lineShapes(SUBAGENT)).toEqual([['session', null], ['tool', 1]]);
  });
});

describe('in-process failure fallback (DEC-09, TC-32)', () => {
  it('returns the neutral fallback and records an unreadable ledger', async () => {
    await mkdir(sessionLedgerPath(root, KEY), { recursive: true });
    expect(await runtime.handle(postTool(KEY, null))).toEqual({ kind: 'neutral' });
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('"code":"LEDGER_UNREADABLE"');
  });
});

describe('in-process cache invalidation (DEC-16)', () => {
  it('re-reads the ledger after a reset invalidates the cache', async () => {
    await runtime.handle(postTool(KEY, 'toolu_1'));
    await runtime.handle({ kind: 'session_reset', session: KEY, reason: 'compact' });
    await new NodeSessionLedger(root, clock).appendToolLine(KEY, toolInput(5, 'external'));
    await runtime.handle(postTool(KEY, 'toolu_2'));
    const lines = await new NodeSessionLedger(root, clock).readLines(KEY);
    expect(lines.at(-1)).toMatchObject({ type: 'tool', turn: 2, toolUseId: 'toolu_2' });
  });
  it('prunes a stale session ledger on a new session through the cached ledger', async () => {
    const stale: SessionKey = { ...KEY, sessionId: 'stale' };
    await new NodeSessionLedger(root, clock).appendToolLine(stale, toolInput(1));
    await utimes(sessionLedgerPath(root, stale), BEYOND_RETENTION, BEYOND_RETENTION);
    expect(await runtime.handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'neutral' });
    await expect(stat(sessionLedgerPath(root, stale))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
