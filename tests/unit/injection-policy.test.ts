import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { decideInjection } from '../../src/core/services/injection-policy.js';

function configWith(mode: ContextBrakeConfig['telemetry']['injectionMode'], threshold: number): ContextBrakeConfig {
  return { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, injectionMode: mode, activationThresholdPercentage: threshold } };
}

describe('injection policy (RF13, CA-01, CA-02, CA-22, DEC-07, TC-05)', () => {
  it('delivers the block for a YELLOW session in the default mode', () => {
    expect(decideInjection({ telemetry: DEFAULT_CONFIG.telemetry, zone: 'YELLOW', usagePercentage: 55, debug: false })).toBe(true);
  });
  it('delivers nothing for a GREEN session below the threshold', () => {
    expect(decideInjection({ telemetry: DEFAULT_CONFIG.telemetry, zone: 'GREEN', usagePercentage: 30, debug: false })).toBe(false);
  });
  it('delivers the block when a GREEN-by-usage session turns YELLOW by turn count', () => {
    expect(decideInjection({ telemetry: DEFAULT_CONFIG.telemetry, zone: 'YELLOW', usagePercentage: 30, debug: false })).toBe(true);
  });
  it('delivers the block when usage reaches the activation threshold while still GREEN', () => {
    expect(decideInjection({ telemetry: configWith('threshold_only', 40).telemetry, zone: 'GREEN', usagePercentage: 40, debug: false })).toBe(true);
    expect(decideInjection({ telemetry: configWith('threshold_only', 40).telemetry, zone: 'GREEN', usagePercentage: 39, debug: false })).toBe(false);
  });
  it('delivers the block on every event in the always mode', () => {
    expect(decideInjection({ telemetry: configWith('always', 50).telemetry, zone: 'GREEN', usagePercentage: 30, debug: false })).toBe(true);
  });
  it('delivers on every non-GREEN zone', () => {
    for (const zone of ['YELLOW', 'RED', 'CRITICAL'] as const) {
      expect(decideInjection({ telemetry: DEFAULT_CONFIG.telemetry, zone, usagePercentage: 30, debug: false }), zone).toBe(true);
    }
  });
});

describe('injection policy in the debug mode (TC-04, FR-03, DEC-04)', () => {
  it('delivers the block for a GREEN session below the threshold when debug is on', () => {
    expect(decideInjection({ telemetry: DEFAULT_CONFIG.telemetry, zone: 'GREEN', usagePercentage: 10, debug: true })).toBe(true);
  });
  it('keeps the threshold for the same session when debug is off', () => {
    expect(decideInjection({ telemetry: DEFAULT_CONFIG.telemetry, zone: 'GREEN', usagePercentage: 10, debug: false })).toBe(false);
  });
});
