import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor } from '../../src/core/contracts/runtime.js';
import type { LedgerLine } from '../../src/core/contracts/session-ledger.js';
import type { StatuslineLine } from '../../src/core/contracts/statusline-line.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { readZone, renderSessionTelemetry, type MeasuredUsage } from '../../src/core/services/session-zone.js';

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

describe('estimated readings keep the recorded window after a reset (FR-06, OBJ-01, DEC-06, TC-22)', () => {
  it('estimates over the status line window after a compaction with a stale transcript reading', () => {
    const result = zoneFor([statusline(BEFORE, 1000000, 500000), RESET, statusline(AFTER, 1000000, null)], { tokens: 900000, contextWindow: null, at: BEFORE });
    expect(result.reading).toEqual({ source: 'estimated', usedTokens: 15150, windowTokens: 1000000, measuredTokens: 15150 });
    expect(result.percentage).toBe(1);
    expect(result.zone).toBe('GREEN');
  });

  it('renders the recorded window in the telemetry block of an estimated reading', () => {
    const summary = summarizeLedger([statusline(BEFORE, 1000000, 500000), RESET]);
    const block = renderSessionTelemetry(SETTINGS, { summary, turns: 1, observedCharacters: 0 }, () => 'keep working');
    expect(block).toContain('tokens=15150/1000000');
    expect(block).toContain('source=estimated');
  });

  it('keeps a harness window from a stale reading over the status line window', () => {
    const result = zoneFor([statusline(BEFORE, 1000000, null), RESET], { tokens: 100000, contextWindow: 272000, at: BEFORE });
    expect(result.reading).toMatchObject({ source: 'estimated', windowTokens: 272000 });
  });

  it('estimates over contextWindowCeiling without any window source', () => {
    const result = zoneFor([RESET], { tokens: 100000, contextWindow: null, at: BEFORE });
    expect(result.reading).toMatchObject({ source: 'estimated', windowTokens: 128000 });
  });
});
