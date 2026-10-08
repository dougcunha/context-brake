import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { sanitizeConfiguration } from '../../src/core/validation/configuration-sanitizer.js';
import { InvalidConfigurationError } from '../../src/core/validation/configuration-validator.js';

describe('sanitizeConfiguration (prd-15 FR-02, TC-03)', () => {
  it('returns a valid configuration untouched with nothing dropped (prd-15 FR-02, TC-03)', () => {
    expect(sanitizeConfiguration(DEFAULT_CONFIG)).toEqual({ config: DEFAULT_CONFIG, dropped: [] });
  });
  it('drops top-level and nested unrecognized keys across passes and lists them (prd-15 FR-02, TC-03)', () => {
    const zones = { ...DEFAULT_CONFIG.telemetry.zones, legacy: 1 };
    const input = { ...DEFAULT_CONFIG, stateStorage: { mode: 'x' }, runner: {}, telemetry: { ...DEFAULT_CONFIG.telemetry, zones } };
    const { config, dropped } = sanitizeConfiguration(input);
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(dropped.map((key) => key.path).sort()).toEqual(['runner', 'stateStorage', 'telemetry.zones.legacy']);
    expect(dropped.find((key) => key.path === 'stateStorage')?.received).toEqual({ mode: 'x' });
  });
  it('does not mutate its input (prd-15 FR-02, TC-03)', () => {
    const input = { ...DEFAULT_CONFIG, brake: {} };
    const snapshot = JSON.stringify(input);
    sanitizeConfiguration(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
  it('throws the error of the failing pass when another issue exists (prd-15 FR-02, TC-03)', () => {
    const withoutTelemetry = Object.fromEntries(Object.entries(DEFAULT_CONFIG).filter(([key]) => key !== 'telemetry'));
    const input = { ...withoutTelemetry, telemtry: DEFAULT_CONFIG.telemetry };
    expect(() => sanitizeConfiguration(input)).toThrow(InvalidConfigurationError);
    try {
      sanitizeConfiguration(input);
    } catch (error) {
      expect((error as InvalidConfigurationError).issues.map((issue) => issue.path).sort()).toEqual(['telemetry', 'telemtry']);
      expect((error as InvalidConfigurationError).remediation).toBeNull();
    }
  });
});
