import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey } from '../../src/core/contracts/runtime.js';
import type { LedgerLine, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { readZone, renderSessionTelemetry } from '../../src/core/services/session-zone.js';

const AT = '2026-09-23T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const SETTINGS = { descriptor: DESCRIPTOR, config: DEFAULT_CONFIG };

function toolLines(characters: readonly number[]): ToolLine[] {
  return characters.map((observedCharacters, index) => ({ v: 1, type: 'tool', at: AT, toolUseId: `toolu_${index + 1}`, observedCharacters, turn: index + 1, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' }));
}
function engineFor(lines: readonly LedgerLine[]) {
  const ledger: SessionLedger = { readLines: async () => lines, appendSessionLine: async () => undefined, appendToolLine: async () => undefined, appendResetLine: async () => undefined, pruneStaleSessions: async () => 0 };
  return createBrakeEngine({ descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, ledger, blocks: { append: async () => undefined }, readValidationCommand: async () => null });
}

describe('session zone extraction matches the brake engine (TC-16, DEC-20)', () => {
  it.each([
    ['yellow usage', [200000]],
    ['red usage over several turns', [120000, 90000, 60000]],
    ['critical turn count', Array.from({ length: 12 }, () => 100)],
  ])('renders the same block the engine injects for %s', async (_case, characters) => {
    const lines = toolLines(characters);
    const decision = await engineFor(lines).handle({ kind: 'pre_invocation', session: KEY });
    const summary = summarizeLedger(lines);
    expect(decision).toEqual({ kind: 'context', block: renderSessionTelemetry(SETTINGS, { summary, turns: summary.turns, observedCharacters: 0 }) });
  });

  it('renders a block below the activation threshold, where the engine stays neutral (CA-12)', async () => {
    const lines = toolLines([100]);
    const summary = summarizeLedger(lines);
    expect(await engineFor(lines).handle({ kind: 'pre_invocation', session: KEY })).toEqual({ kind: 'neutral' });
    expect(renderSessionTelemetry(SETTINGS, { summary, turns: summary.turns, observedCharacters: 0 })).toMatch(/^\[ContextBrake v1\] turn=1\/12 .* zone=GREEN /);
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
