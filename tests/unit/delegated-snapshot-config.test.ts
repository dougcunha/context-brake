import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { InvalidConfigurationError, parseConfiguration, type ConfigurationIssue } from '../../src/core/validation/configuration-validator.js';

const section = { snapshotCommand: '/sdd-snapshot', allowedPaths: ['tasks/**/context-snapshot.md'] };
function withSection(value: unknown): Record<string, unknown> { return { ...DEFAULT_CONFIG, delegatedSnapshot: value }; }
function issuePaths(input: unknown): string[] {
  try {
    parseConfiguration(input);
  } catch (error) {
    if (error instanceof InvalidConfigurationError) return error.issues.map((issue: ConfigurationIssue) => issue.path);
    throw error;
  }
  return [];
}
describe('delegated snapshot configuration (TC-01, FR-01, FR-02, FR-03, NFR-01, NFR-02)', () => {
  it('keeps the default configuration without the section', () => {
    const parsed = parseConfiguration(DEFAULT_CONFIG);
    expect('delegatedSnapshot' in parsed).toBe(false);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(DEFAULT_CONFIG));
  });
  it('fills defaults for trigger zone, paths, and skills', () => {
    const parsed = parseConfiguration(withSection({ snapshotCommand: '/sdd-snapshot' }));
    expect(parsed.delegatedSnapshot).toEqual({ snapshotCommand: '/sdd-snapshot', triggerZone: 'RED', allowedPaths: [], allowedSkills: [] });
  });
  it('accepts every documented field', () => {
    const full = { ...section, triggerZone: 'YELLOW', resumeCommand: 'Use the resume skill', allowedSkills: ['sdd-snapshot', 'plugin:save.state_1'] };
    expect(parseConfiguration(withSection(full)).delegatedSnapshot).toEqual(full);
  });
  it('accepts a 200-char command', () => {
    expect(issuePaths(withSection({ snapshotCommand: 'x'.repeat(200) }))).toEqual([]);
  });
});

describe('delegated snapshot validation errors (TC-01, FR-02, NFR-02)', () => {
  it.each([
    ['empty command', { snapshotCommand: '' }, 'delegatedSnapshot.snapshotCommand'],
    ['multi-line command', { snapshotCommand: '/a\nrm' }, 'delegatedSnapshot.snapshotCommand'],
    ['padded command', { snapshotCommand: ' /a' }, 'delegatedSnapshot.snapshotCommand'],
    ['201-char command', { snapshotCommand: 'x'.repeat(201) }, 'delegatedSnapshot.snapshotCommand'],
    ['multi-line resume', { ...section, resumeCommand: 'a\rb' }, 'delegatedSnapshot.resumeCommand'],
    ['unknown trigger', { ...section, triggerZone: 'GREEN' }, 'delegatedSnapshot.triggerZone'],
    ['traversal pattern', { ...section, allowedPaths: ['tasks/../x'] }, 'delegatedSnapshot.allowedPaths.0'],
    ['absolute pattern', { ...section, allowedPaths: ['/etc/x'] }, 'delegatedSnapshot.allowedPaths.0'],
    ['backslash pattern', { ...section, allowedPaths: ['tasks\\x'] }, 'delegatedSnapshot.allowedPaths.0'],
    ['duplicate pattern', { ...section, allowedPaths: ['a/*', 'a/*'] }, 'delegatedSnapshot.allowedPaths'],
    ['skill with space', { ...section, allowedSkills: ['my skill'] }, 'delegatedSnapshot.allowedSkills.0'],
    ['unknown field', { ...section, extra: true }, 'delegatedSnapshot'],
  ])('rejects %s with the field path', (_, value, path) => {
    expect(issuePaths(withSection(value))).toContain(path);
  });
});
