import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { BlockLog, LedgerLine, ResetReason, SessionLedger, SessionLineInput, ToolLine, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { LedgerUnreadableError } from '../../src/core/services/failure-policy.js';

const AT = '2026-09-15T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [{ id: 'pre_tool_block', state: 'supported' }, { id: 'tool_coverage', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };

function toolLine(observedCharacters: number, turn: number, toolUseId: string | null = `toolu_${turn}`): ToolLine {
  return { v: 1, type: 'tool', at: AT, toolUseId, observedCharacters, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' };
}
function sessionLine(): LedgerLine {
  return { v: 1, type: 'session', at: AT, harness: KEY.harness, sessionId: KEY.sessionId, agentId: null, brakeMode: 'enforced', brakeReason: null };
}
class TestLedger implements SessionLedger {
  prunes = 0;
  failReads = false;
  readonly keys: SessionKey[] = [];
  constructor(readonly lines: LedgerLine[] = []) {}
  async readLines(): Promise<readonly LedgerLine[]> { if (this.failReads) throw new Error('unreadable'); return [...this.lines]; }
  async appendSessionLine(key: SessionKey, input: SessionLineInput): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'session', at: AT, harness: key.harness, sessionId: key.sessionId, agentId: key.agentId, ...input }); }
  async appendToolLine(key: SessionKey, input: ToolLineInput): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'tool', at: AT, ...input }); }
  async appendResetLine(key: SessionKey, reason: ResetReason): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'reset', at: AT, reason }); }
  async pruneStaleSessions(): Promise<number> { this.prunes += 1; return 0; }
}
const blocks: BlockLog = { append: async () => Promise.resolve() };
function setup(lines: LedgerLine[] = [], config: ContextBrakeConfig = DEFAULT_CONFIG) {
  const ledger = new TestLedger(lines);
  return { ledger, engine: createBrakeEngine({ descriptor: DESCRIPTOR, config, ledger, blocks, readValidationCommand: async () => 'npm test', planPresence: { exists: async () => true } }) };
}

describe('brake engine post-tool telemetry (RF12, RF13, CA-01, CA-06, TC-06)', () => {
  it('appends the tool line and injects at yellow', async () => {
    const { ledger, engine } = setup([sessionLine(), toolLine(200000, 1)]);
    const decision = await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_2' }, { observedCharacters: 0 });
    expect(decision).toMatchObject({ kind: 'context' });
    if (decision.kind !== 'context') throw new Error('expected context');
    expect(decision.block).toContain('turn=2 usage=51%');
    expect(decision.block).toContain('zone=YELLOW');
    expect(ledger.lines.at(-1)).toMatchObject({ type: 'tool', turn: 2, toolUseId: 'toolu_2' });
  });
  it('writes the derived session line on the first tool line', async () => {
    const { ledger, engine } = setup();
    await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_1' }, { observedCharacters: 10 });
    expect(ledger.lines[0]).toMatchObject({ type: 'session', brakeMode: 'enforced', brakeReason: null });
    expect(ledger.lines[1]).toMatchObject({ type: 'tool', turn: 1, observedCharacters: 10 });
  });
  it('skips a duplicate call identifier and writes a green line below the threshold', async () => {
    const { ledger, engine } = setup([sessionLine(), toolLine(0, 1, 'toolu_1')]);
    expect(await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_1' })).toEqual({ kind: 'neutral' });
    expect(await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: null })).toEqual({ kind: 'neutral' });
    expect(ledger.lines).toHaveLength(3);
  });
  it('records a measured reading from the in-process host', async () => {
    const { ledger, engine } = setup([sessionLine()]);
    await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: null }, { measured: { tokens: 64000, contextWindow: 128000 } });
    expect(ledger.lines.at(-1)).toMatchObject({ source: 'measured', usedTokens: 64000, windowTokens: 128000, zone: 'YELLOW' });
  });
});

describe('brake engine lifecycle events (RF3, RF22, DEC-13, TC-21)', () => {
  it('appends a reset line, pruning only on a new session', async () => {
    const { ledger, engine } = setup();
    expect(await engine.handle({ kind: 'session_reset', session: KEY, reason: 'compact' })).toEqual({ kind: 'neutral' });
    expect(await engine.handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'neutral' });
    expect(ledger.lines.map((line) => line.type)).toEqual(['reset', 'reset']);
    expect(ledger.prunes).toBe(1);
  });
  it('notifies the user only for the final reset signal', async () => {
    const { engine } = setup();
    expect(await engine.handle({ kind: 'response_end', session: KEY, text: '[REQUEST_SESSION_RESET]' })).toEqual({ kind: 'notify_user', text: 'ContextBrake: the agent requested a session reset. Run /clear to start a new session.' });
    expect(await engine.handle({ kind: 'response_end', session: KEY, text: 'end with [REQUEST_SESSION_RESET] please' })).toEqual({ kind: 'neutral' });
  });
  it('returns telemetry from the pre-invocation event without appending a tool line', async () => {
    const { ledger, engine } = setup([sessionLine(), toolLine(200000, 1)]);
    expect(await engine.handle({ kind: 'pre_invocation', session: KEY })).toMatchObject({ kind: 'context' });
    expect(ledger.lines).toHaveLength(2);
  });
  it('surfaces an unreadable ledger as a dedicated error', async () => {
    const { ledger, engine } = setup();
    ledger.failReads = true;
    await expect(engine.handle({ kind: 'pre_tool', session: KEY, tool: READ })).rejects.toBeInstanceOf(LedgerUnreadableError);
  });
});
