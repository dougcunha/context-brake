import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor } from '../../src/core/contracts/runtime.js';
import type { LedgerLine } from '../../src/core/contracts/session-ledger.js';
import type { StatuslineLine } from '../../src/core/contracts/statusline-line.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { readZone, type MeasuredUsage } from '../../src/core/services/session-zone.js';

const RESET_AT = '2026-09-25T12:00:00.000Z';
const BEFORE = '2026-09-25T11:59:00.000Z';
const AFTER = '2026-09-25T12:01:00.000Z';
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const SETTINGS = { descriptor: DESCRIPTOR, config: DEFAULT_CONFIG };
const RESET: LedgerLine = { v: 1, type: 'reset', at: RESET_AT, reason: 'compact' };

function statusline(at: string, windowTokens: number | null, inputTokens: number | null): StatuslineLine {
  return { v: 1, type: 'statusline', at, windowTokens, inputTokens, usedPercentage: null, model: 'claude-opus-5-5' };
}
function zoneFor(lines: readonly LedgerLine[], measured?: MeasuredUsage) {
  return readZone(SETTINGS, { summary: summarizeLedger(lines), turns: 1, observedCharacters: 0, measured });
}

describe('zone over the status line window (FR-04, DEC-06, TC-03)', () => {
  it('computes the percentage over the recorded window with transcript tokens', () => {
    const result = zoneFor([statusline(BEFORE, 1000000, null)], { tokens: 200000, contextWindow: null, at: AFTER });
    expect(result.reading).toEqual({ source: 'measured', usedTokens: 200000, windowTokens: 1000000, measuredTokens: 200000, windowOrigin: 'harness' });
    expect(result.percentage).toBe(20);
    expect(result.zone).toBe('GREEN');
  });

  it('keeps the recorded window after a reset (FR-06)', () => {
    const result = zoneFor([statusline(BEFORE, 1000000, 500000), RESET], { tokens: 30000, contextWindow: null, at: AFTER });
    expect(result.reading.windowTokens).toBe(1000000);
    expect(result.reading.usedTokens).toBe(30000);
  });
});

describe('status line tokens as the fallback measurement (FR-05, FR-06, TC-04)', () => {
  it('measures from status line tokens recorded after the last reset without a transcript reading', () => {
    const result = zoneFor([RESET, statusline(AFTER, 1000000, 660000)]);
    expect(result.reading).toEqual({ source: 'measured', usedTokens: 660000, windowTokens: 1000000, measuredTokens: 660000, windowOrigin: 'harness' });
    expect(result.zone).toBe('RED');
  });

  it.each([
    { label: 'recorded before the reset line', lines: [statusline(BEFORE, 1000000, 650000), RESET] },
    { label: 'appended after the reset line with the reset timestamp', lines: [RESET, statusline(RESET_AT, 1000000, 650000)] },
  ])('estimates when the status line tokens were $label', ({ lines }) => {
    expect(zoneFor(lines).reading.source).toBe('estimated');
  });

  it('falls back to status line tokens when the transcript measurement is stale', () => {
    const result = zoneFor([RESET, statusline(AFTER, 1000000, 40000)], { tokens: 900000, contextWindow: null, at: BEFORE });
    expect(result.reading).toMatchObject({ source: 'measured', usedTokens: 40000, windowTokens: 1000000 });
  });

  it('prefers transcript tokens over status line tokens', () => {
    const result = zoneFor([statusline(AFTER, 1000000, 40000)], { tokens: 45000, contextWindow: null, at: AFTER });
    expect(result.reading.usedTokens).toBe(45000);
  });
});

describe('zone without the bridge and with a harness window (OBJ-03, FR-04, TC-05)', () => {
  it('classifies measured tokens over contextWindowCeiling when the ledger has no statusline lines', () => {
    const result = zoneFor([], { tokens: 100000, contextWindow: null });
    expect(result).toEqual({ reading: { source: 'measured', usedTokens: 100000, windowTokens: 128000, measuredTokens: 100000, windowOrigin: 'config' }, estimate: 15150, percentage: 78, zone: 'CRITICAL' });
  });

  it('lets a Pi-reported window win over the status line window', () => {
    const result = zoneFor([statusline(BEFORE, 1000000, null)], { tokens: 100000, contextWindow: 272000 });
    expect(result.reading.windowTokens).toBe(272000);
  });
});

describe('estimated readings keep the recorded window after a reset (FR-06, OBJ-01, DEC-06, TC-22)', () => {
  it('estimates over the status line window after a compaction with a stale transcript reading', () => {
    const result = zoneFor([statusline(BEFORE, 1000000, 500000), RESET, statusline(AFTER, 1000000, null)], { tokens: 900000, contextWindow: null, at: BEFORE });
    expect(result.reading).toEqual({ source: 'estimated', usedTokens: 15150, windowTokens: 1000000, measuredTokens: 15150, windowOrigin: 'harness' });
    expect(result.percentage).toBe(1);
    expect(result.zone).toBe('GREEN');
  });

  it('keeps a harness window from a stale reading over the status line window', () => {
    const result = zoneFor([statusline(BEFORE, 1000000, null), RESET], { tokens: 100000, contextWindow: 272000, at: BEFORE });
    expect(result.reading).toMatchObject({ source: 'estimated', windowTokens: 272000 });
  });
});
