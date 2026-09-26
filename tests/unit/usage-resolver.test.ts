import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { EstimationConstants } from '../../src/core/contracts/runtime.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { readZone } from '../../src/core/services/session-zone.js';
import { estimatedTokens, resolveUsage, resolveUsageWithConfig } from '../../src/core/services/usage-resolver.js';

const constants: EstimationConstants = { baselineTokens: 15000, tokensPerTurn: 150 };
const ceiling = DEFAULT_CONFIG.telemetry.contextWindowCeiling;

describe('usage resolver estimation (RF6, RF7, RF8, CA-10, TC-28)', () => {
  it('adds baseline, quarter of observed characters, and turns', () => {
    const estimate = estimatedTokens({ observedCharacters: 1840, turns: 4 }, constants);
    expect(estimate).toBe(15000 + 460 + 600);
    const reading = resolveUsage({ estimated: { observedCharacters: 1840, turns: 4 }, constants, contextWindowCeiling: ceiling });
    expect(reading).toEqual({ source: 'estimated', usedTokens: 16060, windowTokens: 128000, measuredTokens: 16060 });
  });
  it('rounds observed characters up', () => {
    expect(estimatedTokens({ observedCharacters: 1, turns: 0 }, constants)).toBe(15001);
    expect(estimatedTokens({ observedCharacters: 7, turns: 0 }, constants)).toBe(15002);
  });
  it('uses the configured window ceiling when the harness supplies no window', () => {
    const reading = resolveUsageWithConfig({ estimated: { observedCharacters: 0, turns: 0 }, constants }, DEFAULT_CONFIG);
    expect(reading.windowTokens).toBe(128000);
  });
  it('resolves the empty-estimate baseline for the first event of a session', () => {
    const reading = resolveUsage({ estimated: { observedCharacters: 0, turns: 1 }, constants, contextWindowCeiling: ceiling });
    expect(reading.usedTokens).toBe(15150);
  });
});

describe('usage resolver measured readings (RF5, RF7, CA-09, TC-11)', () => {
  it('uses the harness tokens and window and marks the source measured', () => {
    const reading = resolveUsage({ estimated: { observedCharacters: 999999, turns: 9 }, measured: { tokens: 54000, contextWindow: 200000 }, constants, contextWindowCeiling: ceiling });
    expect(reading).toEqual({ source: 'measured', usedTokens: 54000, windowTokens: 200000, measuredTokens: 54000 });
  });
  it('falls back to the estimate over the harness window when the harness reports null tokens (PRD 2.2 DEC-06, TC-22)', () => {
    const reading = resolveUsage({ estimated: { observedCharacters: 1840, turns: 4 }, measured: { tokens: null, contextWindow: 200000 }, constants, contextWindowCeiling: ceiling });
    expect(reading).toEqual({ source: 'estimated', usedTokens: 16060, windowTokens: 200000, measuredTokens: 16060 });
  });
  it('estimates over the configured ceiling when the harness reports neither tokens nor window', () => {
    const reading = resolveUsage({ estimated: { observedCharacters: 1840, turns: 4 }, measured: { tokens: null, contextWindow: null }, constants, contextWindowCeiling: ceiling });
    expect(reading.windowTokens).toBe(128000);
  });
  it('applies a window change reported mid-session', () => {
    const first = resolveUsage({ estimated: { observedCharacters: 0, turns: 1 }, measured: { tokens: 10000, contextWindow: 128000 }, constants, contextWindowCeiling: ceiling });
    const second = resolveUsage({ estimated: { observedCharacters: 0, turns: 2 }, measured: { tokens: 10000, contextWindow: 200000 }, constants, contextWindowCeiling: ceiling });
    expect(first.windowTokens).toBe(128000);
    expect(second.windowTokens).toBe(200000);
  });
  it('uses the configured ceiling as the window of a measurement without one (FR-07, DEC-10, TC-10)', () => {
    const reading = resolveUsage({ estimated: { observedCharacters: 0, turns: 1 }, measured: { tokens: 54000, contextWindow: null }, constants, contextWindowCeiling: 150000 });
    expect(reading).toEqual({ source: 'measured', usedTokens: 54000, windowTokens: 150000, measuredTokens: 54000 });
  });
  it('keeps the parallel estimate available for measured sessions', () => {
    const reading = resolveUsage({ estimated: { observedCharacters: 1840, turns: 4 }, measured: { tokens: 54000, contextWindow: 200000 }, constants, contextWindowCeiling: ceiling });
    expect(reading.measuredTokens).toBe(54000);
    expect(estimatedTokens({ observedCharacters: 1840, turns: 4 }, constants)).toBe(16060);
  });
});

describe('zone reading without status line lines matches the resolver (OBJ-03, PRD 2.2 TC-05)', () => {
  const settings = { descriptor: { estimation: constants }, config: DEFAULT_CONFIG };
  it.each([
    ['no measurement', undefined],
    ['null tokens', { tokens: null, contextWindow: null }],
    ['transcript tokens', { tokens: 90000, contextWindow: null }],
    ['a harness window', { tokens: 90000, contextWindow: 272000 }],
  ])('returns the resolver reading for %s', (_case, measured) => {
    const estimated = { observedCharacters: 400, turns: 2 };
    const reading = readZone(settings, { summary: summarizeLedger([]), turns: 2, observedCharacters: 400, measured }).reading;
    expect(reading).toEqual(resolveUsage({ estimated, measured, constants, contextWindowCeiling: ceiling }));
  });
});
