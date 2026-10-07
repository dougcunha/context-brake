import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { InvalidConfigurationError, parseConfiguration, type ConfigurationIssue } from '../../src/core/validation/configuration-validator.js';

function configurationIssues(input: unknown): ConfigurationIssue[] {
  try {
    parseConfiguration(input);
  } catch (error) {
    if (error instanceof InvalidConfigurationError) return error.issues;
    throw error;
  }
  return [];
}

describe('configuration contract (RF15, RF16, UT-12)', () => {
  it('parses the canonical defaults', () => expect(parseConfiguration(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG));
  it('reports the received source value for invalid zone ordering', () => {
    const invalid = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, yellowMaxPercentage: 40 } } };
    expect(() => parseConfiguration(invalid)).toThrow(InvalidConfigurationError);
    try { parseConfiguration(invalid); } catch (error) { expect(error).toBeInstanceOf(InvalidConfigurationError); expect((error as InvalidConfigurationError).issues).toContainEqual({ path: 'telemetry.zones.yellowMaxPercentage', received: 40, rule: 'must be greater than greenMaxPercentage' }); }
  });
  it('rejects unknown fields', () => {
    const invalid = { ...DEFAULT_CONFIG, extra: true };
    expect(() => parseConfiguration(invalid)).toThrow(InvalidConfigurationError);
  });
  it('rejects non-increasing turn limits (FR-02, TC-03)', () => {
    const invalid = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 10, yellowMaxTurn: 10 } } };
    expect(configurationIssues(invalid)).toContainEqual({ path: 'telemetry.zones.greenMaxTurn', received: 10, rule: 'must be less than yellowMaxTurn' });
  });
  it('rejects a turn limit set without its pair (FR-02, TC-03)', () => {
    const onlyGreen = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 59 } } };
    const onlyYellow = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, yellowMaxTurn: 99 } } };
    expect(configurationIssues(onlyGreen).map((issue) => [issue.path, issue.rule])).toContainEqual(['telemetry.zones.yellowMaxTurn', 'must be set together with greenMaxTurn']);
    expect(configurationIssues(onlyYellow).map((issue) => [issue.path, issue.rule])).toContainEqual(['telemetry.zones.greenMaxTurn', 'must be set together with yellowMaxTurn']);
  });
});

describe('legacy telemetry configuration (FR-09, TC-03)', () => {
  it('accepts a PRD-02 legacy configuration with turn ceiling and critical turn (FR-09, TC-03)', () => {
    const legacy = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, turnCeiling: 12, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 } } };
    expect(parseConfiguration(legacy).telemetry.turnCeiling).toBe(12);
    const mismatched = { ...legacy, telemetry: { ...legacy.telemetry, turnCeiling: 11 } };
    expect(configurationIssues(mismatched)).toEqual([]);
    expect([DEFAULT_CONFIG.telemetry.turnCeiling, DEFAULT_CONFIG.telemetry.zones.greenMaxTurn, DEFAULT_CONFIG.telemetry.zones.criticalTurn]).toEqual([undefined, undefined, undefined]);
  });
});

