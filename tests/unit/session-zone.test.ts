import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey } from '../../src/core/contracts/runtime.js';
import type { LedgerLine, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { readZone } from '../../src/core/services/session-zone.js';
import { renderSessionTelemetry } from '../helpers/session-telemetry.js';
import { zoneAction } from '../../src/core/services/zone-guidance.js';

const AT = '2026-09-23T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const SETTINGS = { descriptor: DESCRIPTOR, config: DEFAULT_CONFIG };
const TURN_LIMITS = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 59, yellowMaxTurn: 99 } } };
function ACTION_FOR(zone: Parameters<typeof zoneAction>[0]): string {
  return zoneAction(zone, DEFAULT_CONFIG.snapshot);
}

function toolLines(characters: readonly number[]): ToolLine[] {
  return characters.map((observedCharacters, index) => ({ v: 1, type: 'tool', at: AT, toolUseId: `toolu_${index + 1}`, observedCharacters, turn: index + 1, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' }));
}
function engineFor(lines: readonly LedgerLine[]) {
  const ledger: SessionLedger = { readLines: async () => lines, appendSessionLine: async () => undefined, appendToolLine: async () => undefined, appendResetLine: async () => undefined, appendStatuslineLine: async () => undefined, pruneStaleSessions: async () => 0 };
  return createBrakeEngine({ descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, ledger });
}

describe('session zone extraction matches the brake engine (TC-16, DEC-20)', () => {
  it('renders the same block the engine injects for critical usage over many turns', async () => {
    const lines = toolLines(Array.from({ length: 12 }, () => 30000));
    const decision = await engineFor(lines).handle({ kind: 'pre_invocation', session: KEY });
    const summary = summarizeLedger(lines);
    expect(decision).toEqual({ kind: 'context', block: renderSessionTelemetry(SETTINGS, { summary, turns: summary.turns, observedCharacters: 0 }, ACTION_FOR) });
  });

  it('renders a block below the activation threshold, where the engine stays neutral (CA-12)', async () => {
    const lines = toolLines([100]);
    const summary = summarizeLedger(lines);
    expect(await engineFor(lines).handle({ kind: 'pre_invocation', session: KEY })).toEqual({ kind: 'neutral' });
    expect(renderSessionTelemetry(SETTINGS, { summary, turns: summary.turns, observedCharacters: 0 }, ACTION_FOR)).toMatch(/^\[ContextBrake v3\] turn=1 .* zone=GREEN /);
  });
});

describe('session zone readings (DEC-20, prd-02.1 FR-02)', () => {
  it.each([
    { label: 'pending characters on top of the ledger', config: DEFAULT_CONFIG, turns: 2, observedCharacters: 400000, expected: { estimate: 115550, percentage: 90, zone: 'CRITICAL' } },
    { label: 'the pending turn, not the ledger turn, against the turn limits', config: TURN_LIMITS, turns: 100, observedCharacters: 0, expected: { estimate: 30250, percentage: 23, zone: 'RED' } },
  ])('classifies $label', ({ config, turns, observedCharacters, expected }) => {
    const summary = summarizeLedger(toolLines([1000]));
    const { estimate, percentage, zone } = readZone({ descriptor: DESCRIPTOR, config }, { summary, turns, observedCharacters });
    expect({ estimate, percentage, zone }).toEqual(expected);
  });
});

describe('session zone stale measurements after a reset (FR-06, DEC-09, TC-11)', () => {
  const summary = summarizeLedger([...toolLines([1000]), { v: 1, type: 'reset', at: AT, reason: 'compact' }]);

  it.each([
    { moment: 'before', at: '2026-09-23T11:59:59.999Z', source: 'estimated' },
    { moment: 'at', at: AT, source: 'estimated' },
    { moment: 'after', at: '2026-09-23T12:00:00.001Z', source: 'measured' },
  ])('reads a measurement taken $moment the reset as $source', ({ at, source }) => {
    const reading = readZone(SETTINGS, { summary, turns: 0, observedCharacters: 0, measured: { tokens: 100000, contextWindow: null, at } });
    expect(reading.reading.source).toBe(source);
  });
});
