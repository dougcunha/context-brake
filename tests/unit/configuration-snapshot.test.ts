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

describe('single-mode configuration (prd-12 FR-02, FR-04, TC-04)', () => {
  it.each(['lightMode', 'fullMode', 'delegatedSnapshot', 'brake', 'stateStorage', 'instructionFiles'])('rejects the removed %s key and names it (prd-12 FR-02, TC-04)', (key) => {
    const issues = configurationIssues({ ...DEFAULT_CONFIG, [key]: {} });
    expect(issues).toContainEqual(expect.objectContaining({ path: key, rule: 'is not a recognized key' }));
  });
  it('names every removed key in the error message the CLI prints (prd-12 FR-02, TC-04)', () => {
    expect(() => parseConfiguration({ ...DEFAULT_CONFIG, stateStorage: {}, runner: {} })).toThrow('Configuration validation failed:\n  stateStorage is not a recognized key\n  runner is not a recognized key');
  });
  it('requires a snapshot command for a resume command (prd-12 FR-04, TC-04)', () => {
    const issues = configurationIssues({ ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED', resumeCommand: '/r' } });
    expect(issues).toContainEqual(expect.objectContaining({ path: 'snapshot.resumeCommand', rule: 'requires snapshot.command' }));
  });
  it('defaults the snapshot section to a RED trigger without commands (prd-12 FR-04)', () => {
    const file: Record<string, unknown> = { ...DEFAULT_CONFIG };
    delete file['snapshot'];
    expect(parseConfiguration(file).snapshot).toEqual({ triggerZone: 'RED' });
  });
  it('rejects the removed runner key and names it (FR-02, TC-04)', () => {
    const issues = configurationIssues({ ...DEFAULT_CONFIG, runner: { maxSessions: 20 } });
    expect(issues.map((issue) => `${issue.path} ${issue.rule}`).join(' ')).toContain('runner');
  });
});
