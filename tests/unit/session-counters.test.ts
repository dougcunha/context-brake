import { describe, expect, it } from 'vitest';
import type { LedgerLine, ResetLine, SessionLine, ToolLine } from '../../src/core/contracts/session-ledger.js';
import { nextTurn, summarizeLedger } from '../../src/core/services/session-counters.js';

const AT = '2026-09-15T10:00:00.000Z';

function sessionLine(): SessionLine {
  return { v: 1, type: 'session', at: AT, harness: 'claude-code', sessionId: 's1', agentId: null, brakeMode: 'enforced', brakeReason: null };
}
function toolLine(overrides: Partial<ToolLine> = {}): ToolLine {
  return { v: 1, type: 'tool', at: AT, toolUseId: 'toolu_1', observedCharacters: 100, turn: 1, usedTokens: 15100, windowTokens: 128000, estimatedTokens: 15100, source: 'estimated', zone: 'GREEN', ...overrides };
}
function resetLine(reason: ResetLine['reason'] = 'new', at = AT): ResetLine {
  return { v: 1, type: 'reset', at, reason };
}

describe('session counters (RF1, RF2, RF3, CA-06, CA-07, TC-09)', () => {
  it('reports zero turns and the first turn on an empty ledger', () => {
    const summary = summarizeLedger([]);
    expect(summary.turns).toBe(0);
    expect(nextTurn(summary)).toBe(1);
    expect(summary.lastReading).toBeNull();
    expect(summary.lastZone).toBeNull();
    expect(summary.sessionLine).toBeNull();
  });
  it('counts the tool lines of the session and sums the observed characters', () => {
    const lines: LedgerLine[] = [sessionLine(), toolLine(), toolLine({ toolUseId: 'toolu_2', turn: 2, observedCharacters: 40, zone: 'YELLOW' })];
    const summary = summarizeLedger(lines);
    expect(summary.turns).toBe(2);
    expect(nextTurn(summary)).toBe(3);
    expect(summary.observedCharacters).toBe(140);
    expect(summary.lastZone).toBe('YELLOW');
    expect(summary.lastReading?.turn).toBe(2);
    expect(summary.sessionLine?.sessionId).toBe('s1');
  });
});

describe('session counter resets and deduplication (RF1, RF3, CA-06, CA-07)', () => {
  it('deduplicates a repeated tool call identifier and keeps each unidentified call', () => {
    const lines: LedgerLine[] = [sessionLine(), toolLine(), toolLine({ turn: 2 }), toolLine({ toolUseId: null, turn: 3 }), toolLine({ toolUseId: null, turn: 4, zone: 'RED' })];
    const summary = summarizeLedger(lines);
    expect(summary.turns).toBe(3);
    expect(summary.observedCharacters).toBe(300);
    expect(summary.toolUseIds.has('toolu_1')).toBe(true);
    expect(summary.lastZone).toBe('RED');
  });
  it('restarts the count at the reset line and ignores earlier readings', () => {
    const lines: LedgerLine[] = [sessionLine(), toolLine(), toolLine({ toolUseId: 'toolu_2', turn: 2, zone: 'RED' }), resetLine('compact'), toolLine({ toolUseId: 'toolu_3', turn: 3, observedCharacters: 20, zone: 'GREEN' })];
    const summary = summarizeLedger(lines);
    expect(summary.turns).toBe(1);
    expect(nextTurn(summary)).toBe(2);
    expect(summary.observedCharacters).toBe(20);
    expect(summary.lastZone).toBe('GREEN');
  });
  it('keeps the session line across a reset', () => {
    const summary = summarizeLedger([sessionLine(), resetLine('clear')]);
    expect(summary.turns).toBe(0);
    expect(summary.sessionLine?.brakeMode).toBe('enforced');
  });
});

describe('session counter last reset time (FR-06, DEC-09, TC-12)', () => {
  it('has no reset time without a reset line', () => {
    expect(summarizeLedger([sessionLine(), toolLine()]).lastResetAt).toBeNull();
  });
  it('reports the time of the last of two reset lines', () => {
    const lines: LedgerLine[] = [sessionLine(), resetLine('compact', '2026-09-15T10:01:00.000Z'), toolLine(), resetLine('clear', '2026-09-15T10:02:00.000Z'), toolLine({ toolUseId: 'toolu_2' })];
    expect(summarizeLedger(lines).lastResetAt).toBe('2026-09-15T10:02:00.000Z');
  });
});
