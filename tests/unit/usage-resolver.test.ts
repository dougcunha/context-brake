import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { EstimationConstants } from '../../src/core/contracts/runtime.js';
import { estimatedTokens, resolveUsage, resolveUsageWithConfig } from '../../src/core/services/usage-resolver.js';

const constants: EstimationConstants = { baselineTokens: 15000, tokensPerTurn: 150 };
const ceiling = DEFAULT_CONFIG.telemetry.contextWindowCeiling;

describe('usage resolver estimation (RF6, RF7, RF8, CA-10, TC-28)', () => {
  it('adds baseline, quarter of observed characters, and turns', () => {
    const estimate = estimatedTokens({ observedCharacters: 1840, turns: 4 }, constants);
    expect(estimate).toBe(15000 + 460 + 600);
    const reading = resolveUsage({ estimated: { observedCharacters: 1840, turns: 4 }, constants, contextWindowCeiling: ceiling });
    expect(reading).toEqual({ source: 'estimated', usedTokens: 16060, windowTokens: 128000, measuredTokens: 16060, windowOrigin: 'config' });
  });
  it('rounds observed characters up', () => {
    expect(estimatedTokens({ observedCharacters: 1, turns: 0 }, constants)).toBe(15001);
    expect(estimatedTokens({ observedCharacters: 7, turns: 0 }, constants)).toBe(15002);
  });
  it('uses the configured window ceiling when the harness supplies no window', () => {
    const reading = resolveUsageWithConfig({ estimated: { observedCharacters: 0, turns: 0 }, constants }, DEFAULT_CONFIG);
    expect(reading.windowTokens).toBe(128000);
  });
});

describe('usage resolver measured readings (RF5, RF7, CA-09, TC-11)', () => {
  it('uses the harness tokens and window and marks the source measured', () => {
    const reading = resolveUsage({ estimated: { observedCharacters: 999999, turns: 9 }, measured: { tokens: 54000, contextWindow: 200000 }, constants, contextWindowCeiling: ceiling });
    expect(reading).toEqual({ source: 'measured', usedTokens: 54000, windowTokens: 200000, measuredTokens: 54000, windowOrigin: 'harness' });
  });
  it.each([
    { window: 200000, expected: { windowTokens: 200000, windowOrigin: 'harness' } },
    { window: null, expected: { windowTokens: 128000, windowOrigin: 'config' } },
  ])('falls back to the estimate over window $expected.windowOrigin when the harness reports null tokens and window $window (PRD 2.2 DEC-06, TC-22)', ({ window, expected }) => {
    const reading = resolveUsage({ estimated: { observedCharacters: 1840, turns: 4 }, measured: { tokens: null, contextWindow: window }, constants, contextWindowCeiling: ceiling });
    expect(reading).toEqual({ source: 'estimated', usedTokens: 16060, measuredTokens: 16060, ...expected });
  });
  it('uses the configured ceiling as the window of a measurement without one (FR-07, DEC-10, TC-10)', () => {
    const reading = resolveUsage({ estimated: { observedCharacters: 0, turns: 1 }, measured: { tokens: 54000, contextWindow: null }, constants, contextWindowCeiling: 150000 });
    expect(reading).toEqual({ source: 'measured', usedTokens: 54000, windowTokens: 150000, measuredTokens: 54000, windowOrigin: 'config' });
  });
});
