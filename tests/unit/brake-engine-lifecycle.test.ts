import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDecision, RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { LedgerLine, ResetReason, SessionLedger, ToolLine, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine, type RuntimeInput } from '../../src/core/services/brake-engine.js';
import { LedgerUnreadableError } from '../../src/core/services/failure-policy.js';

const AT = '2026-09-15T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const SIGNAL = '[REQUEST_SESSION_RESET]';
const NOTICE = 'ContextBrake: the agent requested a session reset. Run /clear to start a new session';
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };

function toolLine(observedCharacters: number, turn: number, toolUseId: string | null = `toolu_${turn}`): ToolLine {
  return { v: 1, type: 'tool', at: AT, toolUseId, observedCharacters, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' };
}
function sessionLine(): LedgerLine {
  return { v: 1, type: 'session', at: AT, harness: KEY.harness, sessionId: KEY.sessionId, agentId: null };
}
class TestLedger implements SessionLedger {
  prunes = 0;
  failReads = false;
  readonly keys: SessionKey[] = [];
  constructor(readonly lines: LedgerLine[] = []) {}
  async readLines(): Promise<readonly LedgerLine[]> { if (this.failReads) throw new Error('unreadable'); return [...this.lines]; }
  async appendSessionLine(key: SessionKey): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'session', at: AT, harness: key.harness, sessionId: key.sessionId, agentId: key.agentId }); }
  async appendToolLine(key: SessionKey, input: ToolLineInput): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'tool', at: AT, ...input }); }
  async appendResetLine(key: SessionKey, reason: ResetReason): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'reset', at: AT, reason }); }
  async appendStatuslineLine(): Promise<void> { return undefined; }
  async pruneStaleSessions(): Promise<number> { this.prunes += 1; return 0; }
}
function setup(lines: LedgerLine[] = [], config: ContextBrakeConfig = DEFAULT_CONFIG, descriptor: RuntimeDescriptor = DESCRIPTOR) {
  const ledger = new TestLedger(lines);
  return { ledger, engine: createBrakeEngine({ descriptor, config, ledger }) };
}

describe('brake engine post-tool telemetry (RF12, RF13, CA-01, CA-06, TC-06)', () => {
  it.each<{ source: string; lines: LedgerLine[]; input: RuntimeInput; expected: Partial<ToolLine> }>([
    { source: 'estimated', lines: [sessionLine(), toolLine(200000, 1)], input: { observedCharacters: 0 }, expected: { source: 'estimated', turn: 2, zone: 'YELLOW' } },
    { source: 'measured', lines: [sessionLine()], input: { measured: { tokens: 64000, contextWindow: 128000 } }, expected: { source: 'measured', usedTokens: 64000, windowTokens: 128000, turn: 1, zone: 'YELLOW' } },
  ])('appends the $source tool line and injects the YELLOW block', async ({ lines, input, expected }) => {
    const { ledger, engine } = setup(lines);
    expect(await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_9' }, input)).toMatchObject({ kind: 'context', block: expect.stringContaining(`turn=${expected.turn} usage=`) });
    expect(ledger.lines.at(-1)).toMatchObject({ type: 'tool', toolUseId: 'toolu_9', ...expected });
  });
  it('writes the derived session line on the first tool line', async () => {
    const { ledger, engine } = setup();
    await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_1' }, { observedCharacters: 10 });
    expect(ledger.lines[0]).toMatchObject({ type: 'session' });
    expect(ledger.lines[1]).toMatchObject({ type: 'tool', turn: 1, observedCharacters: 10, toolUseId: 'toolu_1' });
  });
  it('skips a duplicate call identifier and writes a green line below the threshold', async () => {
    const { ledger, engine } = setup([sessionLine(), toolLine(0, 1, 'toolu_1')]);
    expect(await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_1' })).toEqual({ kind: 'neutral' });
    expect(await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: null })).toEqual({ kind: 'neutral' });
    expect(ledger.lines).toHaveLength(3);
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
  it.each<{ label: string; text: string; config?: ContextBrakeConfig; descriptor?: RuntimeDescriptor; expected: RuntimeDecision }>([
    { label: 'notifies the new-session command for the final reset signal', text: SIGNAL, expected: { kind: 'notify_user', text: `${NOTICE}.` } },
    { label: 'says the new session resumes by itself when restart is on (prd-14 DEC-18)', text: SIGNAL, config: { ...DEFAULT_CONFIG, autoRestart: { maxConsecutiveRestarts: 2 } }, expected: { kind: 'notify_user', text: `${NOTICE}; it resumes by itself.` } },
    { label: 'stays neutral for a signal in the middle of the reply', text: `end with ${SIGNAL} please`, expected: { kind: 'neutral' } },
    { label: 'stays neutral on a harness without a new-session command', text: SIGNAL, descriptor: { ...DESCRIPTOR, newSessionCommand: null }, expected: { kind: 'neutral' } },
  ])('$label', async ({ text, config, descriptor, expected }) => {
    const { engine } = setup([], config, descriptor);
    expect(await engine.handle({ kind: 'response_end', session: KEY, text })).toEqual(expected);
  });
  it('returns telemetry from the pre-invocation event without appending a tool line', async () => {
    const { ledger, engine } = setup([sessionLine(), toolLine(200000, 1)]);
    expect(await engine.handle({ kind: 'pre_invocation', session: KEY })).toMatchObject({ kind: 'context' });
    expect(ledger.lines).toHaveLength(2);
  });
  it('surfaces an unreadable ledger as a dedicated error', async () => {
    const { ledger, engine } = setup();
    ledger.failReads = true;
    await expect(engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: null })).rejects.toBeInstanceOf(LedgerUnreadableError);
  });
});
