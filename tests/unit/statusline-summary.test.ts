import { describe, expect, it } from 'vitest';
import type { LedgerLine } from '../../src/core/contracts/session-ledger.js';
import type { StatuslineLine } from '../../src/core/contracts/statusline-line.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { summarizeStatusline } from '../../src/core/services/statusline-summary.js';

const BEFORE = '2026-09-25T11:00:00.000Z';
const AFTER = '2026-09-25T12:01:00.000Z';
const RESET: LedgerLine = { v: 1, type: 'reset', at: '2026-09-25T12:00:00.000Z', reason: 'compact' };

function statusline(at: string, windowTokens: number | null, inputTokens: number | null): StatuslineLine {
  return { v: 1, type: 'statusline', at, windowTokens, inputTokens, usedPercentage: null, model: null };
}

describe('status line summary (FR-04, FR-06, DEC-05, TC-02)', () => {
  it('keeps the window but drops the usage recorded before the last reset of the ledger', () => {
    const lines = [statusline(BEFORE, 1000000, 200000), RESET];
    expect(summarizeLedger(lines).statusline).toEqual({ windowTokens: 1000000, usage: null });
  });
  it('uses the latest window and reads the usage recorded after the reset with its timestamp', () => {
    const lines = [statusline(BEFORE, 200000, 1000), RESET, statusline(AFTER, 1000000, 30000)];
    expect(summarizeStatusline(lines, 1)).toEqual({ windowTokens: 1000000, usage: { tokens: 30000, at: AFTER } });
  });
  it('does not let null values overwrite the last valid ones', () => {
    const lines = [statusline(AFTER, 1000000, 30000), statusline('2026-09-25T12:02:00.000Z', null, null)];
    expect(summarizeStatusline(lines, -1)).toEqual({ windowTokens: 1000000, usage: { tokens: 30000, at: AFTER } });
  });
});
