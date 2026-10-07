import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { checkConfig } from '../../src/core/services/doctor-checks.js';

describe('Doctor pure diagnostic checks: config (TC-13)', () => {
  it('reports an invalid configuration as an error', () => {
    expect(checkConfig(null, new Error('invalid syntax')).findings[0]?.code).toBe('INVALID_CONTEXTBRAKE_CONFIG');
  });
  it('reports a missing configuration as a warning', () => {
    expect(checkConfig(null).findings[0]?.code).toBe('CONFIG_MISSING');
  });
  it('reports nothing for the default configuration', () => {
    expect(checkConfig({ ...DEFAULT_CONFIG }).findings).toHaveLength(0);
  });
});
