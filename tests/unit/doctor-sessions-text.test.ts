import { describe, expect, it } from 'vitest';
import { sessionRows } from '../../src/cli/output/doctor-sessions-text.js';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';

type ActiveSession = NonNullable<DoctorReport['activeSessions']>[number];

const NOW = new Date('2026-10-21T12:00:00.000Z');
const FOUR_MINUTES_AGO = '2026-10-21T11:56:00.000Z';

function session(sessionId: string | null, lastActivityAt: string, usage: ActiveSession['usage']): ActiveSession {
  return { harness: 'claude-code', sessionId, lastActivityAt, usage };
}

describe('doctor session rows (FR-08, NFR-03, TC-06)', () => {
  it('prints usage with fixed thousands separators and the time since last activity', () => {
    const rows = sessionRows([
      session('s-1', NOW.toISOString(), { percentage: 8, usedTokens: 84200, windowTokens: 1000000, zone: 'GREEN', source: 'measured', at: NOW.toISOString() }),
      session(null, FOUR_MINUTES_AGO, null),
    ], NOW);
    expect(rows).toEqual([
      { label: 's-1', value: 'claude-code  8%  84,200 / 1,000,000  GREEN  measured  now' },
      { label: '(unknown session)', value: 'claude-code  usage unknown since last reset  4 min ago' },
    ]);
  });
  it('prints nothing without active sessions', () => {
    expect(sessionRows(undefined, NOW)).toEqual([]);
  });
});
