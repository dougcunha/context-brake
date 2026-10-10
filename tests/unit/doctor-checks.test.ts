import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { checkConfig } from '../../src/core/services/doctor-checks.js';

describe('Doctor pure diagnostic checks: config (TC-13)', () => {
  it.each([
    ['an invalid', new Error('invalid syntax'), { code: 'INVALID_CONTEXTBRAKE_CONFIG', severity: 'error', message: 'invalid syntax', remediation: 'Fix syntax or structure in context-brake.config.json.' }],
    ['a missing', undefined, { code: 'CONFIG_MISSING', severity: 'warning', remediation: 'Run context-brake init --yes.' }],
  ])('reports %s configuration and falls back to the defaults', (_label, error, expected) => {
    const result = checkConfig(null, error);
    expect(result.findings).toEqual([expect.objectContaining(expected)]);
    expect(result.effective).toBe(DEFAULT_CONFIG);
  });
});
