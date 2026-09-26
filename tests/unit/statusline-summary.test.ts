import { describe, expect, it } from 'vitest';
import type { LedgerLine } from '../../src/core/contracts/session-ledger.js';
import type { StatuslineLine } from '../../src/core/contracts/statusline-line.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { summarizeStatusline } from '../../src/core/services/statusline-summary.js';

function statusline(at: string, windowTokens: number | null, inputTokens: number | null): StatuslineLine {
  return { v: 1, type: 'statusline', at, windowTokens, inputTokens, usedPercentage: null, model: null };
}
const RESET: LedgerLine = { v: 1, type: 'reset', at: '2026-09-25T12:00:00.000Z', reason: 'compact' };

describe('status line summary (FR-04, FR-06, DEC-05, TC-02)', () => {
  it('returns no window and no usage without statusline lines', () => {
    expect(summarizeStatusline([RESET], 0)).toEqual({ windowTokens: null, usage: null });
  });

  it('keeps the window recorded before the reset', () => {
    const lines = [statusline('2026-09-25T11:00:00.000Z', 1000000, 200000), RESET];
    expect(summarizeStatusline(lines, 1).windowTokens).toBe(1000000);
  });

  it('uses the latest window, recorded after the reset', () => {
    const lines = [statusline('2026-09-25T11:00:00.000Z', 200000, 1000), RESET, statusline('2026-09-25T12:01:00.000Z', 1000000, 2000)];
    expect(summarizeStatusline(lines, 1).windowTokens).toBe(1000000);
  });

  it('drops usage recorded before the reset', () => {
    const lines = [statusline('2026-09-25T11:00:00.000Z', 1000000, 200000), RESET];
    expect(summarizeStatusline(lines, 1).usage).toBeNull();
  });

  it('reads usage recorded after the reset with its timestamp', () => {
    const lines = [statusline('2026-09-25T11:00:00.000Z', 1000000, 200000), RESET, statusline('2026-09-25T12:01:00.000Z', null, 30000)];
    expect(summarizeStatusline(lines, 1).usage).toEqual({ tokens: 30000, at: '2026-09-25T12:01:00.000Z' });
  });

  it('does not let null values overwrite the last valid ones', () => {
    const lines = [statusline('2026-09-25T12:01:00.000Z', 1000000, 30000), statusline('2026-09-25T12:02:00.000Z', null, null)];
    expect(summarizeStatusline(lines, -1)).toEqual({ windowTokens: 1000000, usage: { tokens: 30000, at: '2026-09-25T12:01:00.000Z' } });
  });
});

describe('ledger summary with statusline lines (DEC-05, TC-02)', () => {
  it('is filled by the ledger summary using the last reset', () => {
    const lines = [statusline('2026-09-25T11:00:00.000Z', 1000000, 200000), RESET, statusline('2026-09-25T12:01:00.000Z', null, 30000)];
    expect(summarizeLedger(lines).statusline).toEqual({ windowTokens: 1000000, usage: { tokens: 30000, at: '2026-09-25T12:01:00.000Z' } });
  });

  it('does not count statusline lines as turns', () => {
    expect(summarizeLedger([statusline('2026-09-25T12:01:00.000Z', 1000000, 30000)]).turns).toBe(0);
  });
});
