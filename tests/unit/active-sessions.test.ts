import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { LedgerLine, SessionLine, ToolLine } from '../../src/core/contracts/session-ledger.js';
import type { StatuslineLine } from '../../src/core/contracts/statusline-line.js';
import { activeSessions, type HarnessLedger } from '../../src/core/services/active-sessions.js';

const NOW = new Date('2026-09-26T12:00:00.000Z');
const ZONES = DEFAULT_CONFIG.telemetry.zones;
function minutesAgo(minutes: number): string { return new Date(NOW.getTime() - minutes * 60_000).toISOString(); }
function sessionLine(sessionId: string, at: string): SessionLine { return { v: 1, type: 'session', at, harness: 'claude-code', sessionId, agentId: null }; }
function toolLine(at: string, usedTokens = 64000): ToolLine { return { v: 1, type: 'tool', at, toolUseId: `t-${at}`, observedCharacters: 10, turn: 1, usedTokens, windowTokens: 128000, estimatedTokens: usedTokens, source: 'estimated', zone: 'YELLOW' }; }
function statusLine(at: string, inputTokens: number): StatuslineLine { return { v: 1, type: 'statusline', at, windowTokens: 1000000, inputTokens, usedPercentage: null, model: null }; }
function ledger(sessionId: string, lines: LedgerLine[]): HarnessLedger { return { harness: 'claude-code', lines: [sessionLine(sessionId, lines[0]?.at ?? minutesAgo(0)), ...lines] }; }
function sessions(ledgers: HarnessLedger[]) { return activeSessions(ledgers, { now: NOW, zones: ZONES }); }

describe('active sessions window and order (TC-16, FR-14, PD-05)', () => {
  it('lists recent sessions newest first and drops those older than 30 minutes', () => {
    const result = sessions([ledger('old', [toolLine(minutesAgo(31))]), ledger('five', [toolLine(minutesAgo(5))]), ledger('one', [toolLine(minutesAgo(1))])]);
    expect(result.map((session) => session.sessionId)).toEqual(['one', 'five']);
    expect(result[0]?.lastActivityAt).toBe(minutesAgo(1));
  });
  it('keeps at most 10 sessions', () => {
    const many = Array.from({ length: 12 }, (_, index) => ledger(`s${index}`, [toolLine(minutesAgo(index))]));
    expect(sessions(many)).toHaveLength(10);
  });
  it('excludes a ledger without a parseable timestamp', () => {
    expect(sessions([{ harness: 'codex-cli', lines: [{ ...toolLine('not-a-date') }] }])).toEqual([]);
  });
});

describe('active session usage (TC-16, FR-14)', () => {
  it('uses the last tool reading when it is the newest', () => {
    const [session] = sessions([ledger('a', [statusLine(minutesAgo(3), 500000), toolLine(minutesAgo(2))])]);
    expect(session?.usage).toEqual({ percentage: 50, usedTokens: 64000, windowTokens: 128000, zone: 'YELLOW', source: 'estimated', at: minutesAgo(2) });
  });
  it('uses a newer status line reading with a classified zone', () => {
    const [session] = sessions([ledger('a', [toolLine(minutesAgo(3)), statusLine(minutesAgo(1), 700000)])]);
    expect(session?.usage).toEqual({ percentage: 70, usedTokens: 700000, windowTokens: 1000000, zone: 'RED', source: 'measured', at: minutesAgo(1) });
  });
  it('reports unknown usage after a reset with no later reading', () => {
    const [session] = sessions([ledger('a', [toolLine(minutesAgo(4)), { v: 1, type: 'reset', at: minutesAgo(2), reason: 'clear' }])]);
    expect(session?.usage).toBeNull();
  });
  it('reports a null session id for a bridge-only ledger', () => {
    const [session] = sessions([{ harness: 'claude-code', lines: [statusLine(minutesAgo(1), 100000)] }]);
    expect(session).toMatchObject({ sessionId: null, usage: { percentage: 10, zone: 'GREEN', source: 'measured' } });
  });
});
