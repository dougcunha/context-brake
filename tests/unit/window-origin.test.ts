import { describe, expect, it } from 'vitest';
import { configurationSchema, DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { CapabilityDefinition } from '../../src/core/contracts/harness.js';
import { toolLineSchema } from '../../src/core/contracts/session-ledger.js';
import { normalizeTurnLimits } from '../../src/core/services/config-legacy-checks.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { readZone, type MeasuredUsage } from '../../src/core/services/session-zone.js';

const ESTIMATION = { baselineTokens: 15000, tokensPerTurn: 150 };
const DECLARED: ContextBrakeConfig = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, declaredContextWindow: 400000 } };
function state(value: CapabilityDefinition['state']): CapabilityDefinition[] {
  return [{ id: 'context_usage', state: value }];
}

function originOf(capabilities: CapabilityDefinition[], measured: MeasuredUsage, config: ContextBrakeConfig = DECLARED) {
  const { reading } = readZone({ descriptor: { estimation: ESTIMATION, capabilities }, config }, { summary: summarizeLedger([]), turns: 1, observedCharacters: 0, measured });
  return { origin: reading.windowOrigin, window: reading.windowTokens };
}

describe('window origin of each reading (prd-09 FR-01, FR-05, DEC-01, DEC-02, TC-01)', () => {
  it('uses the harness window when one is reported', () => {
    expect(originOf(state('supported'), { tokens: 90000, contextWindow: 272000 })).toEqual({ origin: 'harness', window: 272000 });
  });
  it('uses the declared window on a harness without a window source', () => {
    expect(originOf(state('unsupported'), { tokens: null, contextWindow: null })).toEqual({ origin: 'declared', window: 400000 });
  });
  it.each(['supported', 'unknown'] as const)('ignores the declared window when context_usage is %s', (value) => {
    expect(originOf(state(value), { tokens: 90000, contextWindow: null })).toEqual({ origin: 'config', window: 128000 });
  });
  it('falls back to contextWindowCeiling without a harness or declared window', () => {
    expect(originOf(state('unsupported'), { tokens: 90000, contextWindow: null }, DEFAULT_CONFIG)).toEqual({ origin: 'config', window: 128000 });
  });
});

describe('window origin on ledger lines (prd-09 FR-03, DEC-04, TC-04)', () => {
  const line = { v: 1, type: 'tool', at: '2026-09-28T17:00:00.000Z', toolUseId: null, observedCharacters: 0, turn: 1, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' };
  it('parses tool lines with and without windowOrigin', () => {
    expect(toolLineSchema.parse({ ...line, windowOrigin: 'harness' }).windowOrigin).toBe('harness');
    expect(toolLineSchema.parse(line).windowOrigin).toBeUndefined();
  });
});

describe('declared window in the configuration (prd-09 FR-05, NFR-02, DEC-05, TC-05)', () => {
  it('keeps declaredContextWindow through a config rewrite and validates it', () => {
    expect(normalizeTurnLimits(DECLARED.telemetry).declaredContextWindow).toBe(400000);
    expect(configurationSchema.parse(DECLARED).telemetry.declaredContextWindow).toBe(400000);
  });
  it('leaves it out by default', () => {
    expect(DEFAULT_CONFIG.telemetry.declaredContextWindow).toBeUndefined();
    expect('declaredContextWindow' in normalizeTurnLimits(DEFAULT_CONFIG.telemetry)).toBe(false);
  });
});
