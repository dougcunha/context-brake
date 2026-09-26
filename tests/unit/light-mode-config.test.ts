import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, SNAPSHOT_TRIGGER_ZONES } from '../../src/core/contracts/configuration.js';
import { InvalidConfigurationError, parseConfiguration, type ConfigurationIssue } from '../../src/core/validation/configuration-validator.js';

function withSection(value: unknown): Record<string, unknown> { return { ...DEFAULT_CONFIG, lightMode: value }; }
function issuePaths(input: unknown): string[] {
  try {
    parseConfiguration(input);
  } catch (error) {
    if (error instanceof InvalidConfigurationError) return error.issues.map((issue: ConfigurationIssue) => issue.path);
    throw error;
  }
  return [];
}

describe('light mode configuration (TC-01, FR-01, FR-04, NFR-01)', () => {
  it('keeps the default configuration without the section', () => {
    const parsed = parseConfiguration(DEFAULT_CONFIG);
    expect('lightMode' in parsed).toBe(false);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(DEFAULT_CONFIG));
  });
  it('defaults the trigger zone to RED', () => {
    expect(parseConfiguration(withSection({})).lightMode).toEqual({ triggerZone: 'RED' });
  });
  it('accepts YELLOW as the trigger zone', () => {
    expect(parseConfiguration(withSection({ triggerZone: 'YELLOW' })).lightMode).toEqual({ triggerZone: 'YELLOW' });
  });
  it('keeps exporting the trigger zones from the configuration contract', () => {
    expect(SNAPSHOT_TRIGGER_ZONES).toEqual(['YELLOW', 'RED']);
  });
});

describe('light mode validation errors (TC-01, FR-04)', () => {
  it.each([
    ['unknown trigger', { triggerZone: 'GREEN' }, 'lightMode.triggerZone'],
    ['snapshot command', { snapshotCommand: '/sdd-snapshot' }, 'lightMode'],
    ['non-object section', 'light', 'lightMode'],
  ])('rejects %s with the field path', (_, value, path) => {
    expect(issuePaths(withSection(value))).toContain(path);
  });
});
