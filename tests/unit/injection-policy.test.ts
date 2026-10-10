import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import { decideInjection } from '../../src/core/services/injection-policy.js';

type Mode = ContextBrakeConfig['telemetry']['injectionMode'];

function telemetryWith(mode: Mode, threshold: number): ContextBrakeConfig['telemetry'] {
  return { ...DEFAULT_CONFIG.telemetry, injectionMode: mode, activationThresholdPercentage: threshold };
}

describe('injection policy (RF13, CA-01, CA-02, CA-22, DEC-07, TC-05)', () => {
  it.each<{ label: string; mode: Mode; zone: Zone; usage: number; expected: boolean }>([
    { label: 'a session YELLOW by turn count below the threshold', mode: 'threshold_only', zone: 'YELLOW', usage: 30, expected: true },
    { label: 'a GREEN session at the activation threshold', mode: 'threshold_only', zone: 'GREEN', usage: 40, expected: true },
    { label: 'a GREEN session one point below the threshold', mode: 'threshold_only', zone: 'GREEN', usage: 39, expected: false },
    { label: 'a GREEN session below the threshold in the always mode', mode: 'always', zone: 'GREEN', usage: 30, expected: true },
  ])('decides $expected for $label', ({ mode, zone, usage, expected }) => {
    expect(decideInjection({ telemetry: telemetryWith(mode, 40), zone, usagePercentage: usage, debug: false })).toBe(expected);
  });
});

describe('injection policy in the debug mode (TC-04, FR-03, DEC-04)', () => {
  it('delivers the block for a GREEN session below the threshold when debug is on', () => {
    expect(decideInjection({ telemetry: DEFAULT_CONFIG.telemetry, zone: 'GREEN', usagePercentage: 10, debug: true })).toBe(true);
  });
});
