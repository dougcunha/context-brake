import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { parseConfiguration } from '../../src/core/validation/configuration-validator.js';
import { configurationIssues } from '../helpers/configuration-issues.js';

function withZones(zones: Record<string, number>): unknown {
  return { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, ...zones } } };
}

describe('configuration contract (RF15, RF16, UT-12)', () => {
  it('parses the canonical defaults', () => expect(parseConfiguration(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG));
  it.each([
    { zones: { yellowMaxPercentage: 49 }, issue: { path: 'telemetry.zones.yellowMaxPercentage', received: 49, rule: 'must be greater than greenMaxPercentage' } },
    { zones: { yellowMaxPercentage: 75 }, issue: { path: 'telemetry.zones.yellowMaxPercentage', received: 75, rule: 'must be less than criticalPercentage' } },
    { zones: { greenMaxTurn: 10, yellowMaxTurn: 10 }, issue: { path: 'telemetry.zones.greenMaxTurn', received: 10, rule: 'must be less than yellowMaxTurn' } },
    { zones: { greenMaxTurn: 59 }, issue: { path: 'telemetry.zones.yellowMaxTurn', received: undefined, rule: 'must be set together with greenMaxTurn' } },
    { zones: { yellowMaxTurn: 99 }, issue: { path: 'telemetry.zones.greenMaxTurn', received: undefined, rule: 'must be set together with yellowMaxTurn' } },
  ])('rejects zones $zones with the received value and the rule (FR-02, TC-03)', ({ zones, issue }) => {
    expect(configurationIssues(withZones(zones))).toEqual([issue]);
  });
});

describe('legacy telemetry configuration (FR-09, TC-03)', () => {
  it('accepts a PRD-02 legacy configuration with turn ceiling and critical turn (FR-09, TC-03)', () => {
    const legacy = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, turnCeiling: 12, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 } } };
    expect(parseConfiguration(legacy).telemetry).toEqual(legacy.telemetry);
  });
});

describe('excludedHarnesses (prd-15 FR-05, TC-12)', () => {
  it('accepts a unique list of known harness ids (FR-05, TC-12)', () => {
    expect(parseConfiguration({ ...DEFAULT_CONFIG, excludedHarnesses: ['opencode'] }).excludedHarnesses).toEqual(['opencode']);
  });
  it.each([
    { excluded: ['opencode', 'opencode'], issue: { path: 'excludedHarnesses', rule: 'must not contain duplicates' } },
    { excluded: ['nope'], issue: { path: 'excludedHarnesses.0', received: 'nope' } },
  ])('rejects $excluded and names the path (FR-05, TC-12)', ({ excluded, issue }) => {
    expect(configurationIssues({ ...DEFAULT_CONFIG, excludedHarnesses: excluded })).toContainEqual(expect.objectContaining(issue));
  });
});
