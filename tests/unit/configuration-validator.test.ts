import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { UNRECOGNIZED_KEYS_REMEDIATION } from '../../src/core/validation/configuration-validator.js';
import { configurationError } from '../helpers/configuration-issues.js';

const RETIRED_KEYS = ['stateStorage', 'instructionFiles', 'brake', 'lightMode', 'fullMode', 'delegatedSnapshot', 'runner'] as const;

describe('unrecognized configuration keys (prd-15 FR-01, TC-01)', () => {
  it('names every retired key on its own line and sets the remediation (prd-15 FR-01, TC-01; prd-12 FR-02, TC-04)', () => {
    const error = configurationError({ ...DEFAULT_CONFIG, ...Object.fromEntries(RETIRED_KEYS.map((key) => [key, {}])) });
    expect(error?.message.split('\n')).toEqual(['Configuration validation failed:', ...RETIRED_KEYS.map((key) => `  ${key} is not a recognized key`)]);
    expect(error?.remediation).toBe(UNRECOGNIZED_KEYS_REMEDIATION);
  });
  it('names a nested key with its dotted path (prd-15 FR-01, TC-01)', () => {
    const zones = { ...DEFAULT_CONFIG.telemetry.zones, legacy: 1 };
    const error = configurationError({ ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones } });
    expect(error?.issues.map((issue) => issue.path)).toEqual(['telemetry.zones.legacy']);
    expect(error?.remediation).toBe(UNRECOGNIZED_KEYS_REMEDIATION);
  });
  it('keeps the one-line message and no remediation when another issue exists (prd-15 FR-01, TC-01)', () => {
    const error = configurationError({ ...DEFAULT_CONFIG, stateStorage: {}, schemaVersion: 2 });
    expect(error?.message).toMatch(/^Configuration validation failed: .*stateStorage is not a recognized key.*\.$/);
    expect(error?.message).not.toContain('\n');
    expect(error?.remediation).toBeNull();
  });
});
