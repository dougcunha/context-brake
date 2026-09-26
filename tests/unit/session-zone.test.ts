import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey } from '../../src/core/contracts/runtime.js';
import type { LedgerLine, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { readZone, renderSessionTelemetry } from '../../src/core/services/session-zone.js';
import { planGuidance } from '../../src/core/services/zone-guidance.js';

const AT = '2026-09-23T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const SETTINGS = { descriptor: DESCRIPTOR, config: DEFAULT_CONFIG };
const WITH_PLAN = planGuidance({ config: DEFAULT_CONFIG, readValidationCommand: async () => null }, true);
const WITHOUT_PLAN = planGuidance({ config: DEFAULT_CONFIG, readValidationCommand: async () => null }, false);

function toolLines(characters: readonly number[]): ToolLine[] {
  return characters.map((observedCharacters, index) => ({ v: 1, type: 'tool', at: AT, toolUseId: `toolu_${index + 1}`, observedCharacters, turn: index + 1, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' }));
}
function engineFor(lines: readonly LedgerLine[]) {
  const ledger: SessionLedger = { readLines: async () => lines, appendSessionLine: async () => undefined, appendToolLine: async () => undefined, appendResetLine: async () => undefined, appendStatuslineLine: async () => undefined, pruneStaleSessions: async () => 0 };
  return createBrakeEngine({ descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, ledger, blocks: { append: async () => undefined }, readValidationCommand: async () => null, planPresence: { exists: async () => true } });
}

describe('session zone extraction matches the brake engine (TC-16, DEC-20)', () => {
  it.each([
    ['yellow usage', [200000]],
    ['red usage over several turns', [120000, 90000, 60000]],
    ['critical usage over many turns', Array.from({ length: 12 }, () => 30000)],
  ])('renders the same block the engine injects for %s', async (_case, characters) => {
    const lines = toolLines(characters);
    const decision = await engineFor(lines).handle({ kind: 'pre_invocation', session: KEY });
    const summary = summarizeLedger(lines);
    expect(decision).toEqual({ kind: 'context', block: renderSessionTelemetry(SETTINGS, { summary, turns: summary.turns, observedCharacters: 0 }, WITH_PLAN.actionFor) });
  });

  it('renders a block below the activation threshold, where the engine stays neutral (CA-12)', async () => {
    const lines = toolLines([100]);
    const summary = summarizeLedger(lines);
    expect(await engineFor(lines).handle({ kind: 'pre_invocation', session: KEY })).toEqual({ kind: 'neutral' });
    expect(renderSessionTelemetry(SETTINGS, { summary, turns: summary.turns, observedCharacters: 0 }, WITH_PLAN.actionFor)).toMatch(/^\[ContextBrake v2\] turn=1 .* zone=GREEN /);
  });
});

describe('session telemetry plan-aware actions (FR-08, DEC-05, DEC-HIL-04, TC-07)', () => {
  it('uses the no-plan action from the plan guidance for a yellow session without a plan file', () => {
    const summary = summarizeLedger(toolLines([200000]));
    const block = renderSessionTelemetry(SETTINGS, { summary, turns: summary.turns, observedCharacters: 0 }, WITHOUT_PLAN.actionFor);
    expect(block).toContain('zone=YELLOW action=keep working; finish the current unit before large new explorations');
  });
});

describe('session zone readings (DEC-20)', () => {
  it('counts pending characters and turns on top of the ledger', () => {
    const summary = summarizeLedger(toolLines([1000]));
    const before = readZone(SETTINGS, { summary, turns: 1, observedCharacters: 0 });
    const after = readZone(SETTINGS, { summary, turns: 2, observedCharacters: 400000 });
    expect(after.estimate).toBeGreaterThan(before.estimate);
    expect(after.zone).toBe('CRITICAL');
    expect(before.zone).toBe('GREEN');
  });

  it('prefers measured usage when the harness reports it', () => {
    const summary = summarizeLedger([]);
    const reading = readZone(SETTINGS, { summary, turns: 0, observedCharacters: 0, measured: { tokens: 100000, contextWindow: 128000 } });
    expect(reading.reading.source).toBe('measured');
    expect(reading.percentage).toBe(78);
    expect(reading.zone).toBe('CRITICAL');
  });
});

describe('session zone stale measurements after a reset (FR-06, DEC-09, TC-11)', () => {
  const summary = summarizeLedger([...toolLines([1000]), { v: 1, type: 'reset', at: AT, reason: 'compact' }]);

  it.each([
    ['before the reset', '2026-09-23T11:59:59.999Z', 'estimated'],
    ['at the reset', AT, 'estimated'],
    ['after the reset', '2026-09-23T12:00:00.001Z', 'measured'],
  ])('reads a measurement taken %s as %s', (_case, at, source) => {
    const reading = readZone(SETTINGS, { summary, turns: 0, observedCharacters: 0, measured: { tokens: 100000, contextWindow: null, at } });
    expect(reading.reading.source).toBe(source);
  });
  it('keeps a timestamped measurement when the session has no reset', () => {
    const reading = readZone(SETTINGS, { summary: summarizeLedger([]), turns: 0, observedCharacters: 0, measured: { tokens: 100000, contextWindow: null, at: AT } });
    expect(reading.reading).toEqual({ source: 'measured', usedTokens: 100000, windowTokens: 128000, measuredTokens: 100000 });
  });
});
