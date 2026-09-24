import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { RUNNER_DEFAULTS } from '../../src/core/contracts/runner-configuration.js';
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
function fileWithoutRunner(): Record<string, unknown> {
  const file: Record<string, unknown> = { ...DEFAULT_CONFIG };
  delete file['runner'];
  return file;
}
function withRunner(runner: Record<string, unknown>): Record<string, unknown> {
  return { ...fileWithoutRunner(), runner };
}

describe('runner configuration defaults (RF7, DEC-08)', () => {
  it('applies the DEC-08 defaults to a file without runner', () => {
    expect(parseConfiguration(fileWithoutRunner()).runner).toEqual({ maxSessions: 20, maxTotalMinutes: 240, maxSessionMinutes: 30, maxTotalTokens: 5_000_000, validationTimeoutSeconds: 600, maxConsecutiveFailures: 2, criticalGraceSeconds: 120 });
  });
  it('leaves every other section of a file without runner unchanged', () => {
    const { runner, ...rest } = parseConfiguration(fileWithoutRunner());
    expect(runner).toEqual(RUNNER_DEFAULTS);
    expect(rest).toEqual(fileWithoutRunner());
  });
  it('fills omitted fields of a partial runner section with their defaults', () => {
    expect(parseConfiguration(withRunner({ maxSessions: 5 })).runner).toEqual({ ...RUNNER_DEFAULTS, maxSessions: 5 });
  });
  it('carries the runner defaults in DEFAULT_CONFIG', () => expect(DEFAULT_CONFIG.runner).toEqual(RUNNER_DEFAULTS));
  it('accepts a session ceiling equal to the total ceiling', () => {
    expect(parseConfiguration(withRunner({ maxSessionMinutes: 60, maxTotalMinutes: 60 })).runner.maxSessionMinutes).toBe(60);
  });
});

describe('runner configuration rejection (RF7, DEC-08)', () => {
  const fields = Object.keys(RUNNER_DEFAULTS);
  it.each(fields)('rejects zero for %s with the field path', (field) => {
    expect(configurationIssues(withRunner({ [field]: 0 }))).toContainEqual({ path: `runner.${field}`, received: 0, rule: 'must be greater than 0' });
  });
  it.each(fields)('rejects a negative %s', (field) => {
    expect(configurationIssues(withRunner({ [field]: -1 }))).toContainEqual({ path: `runner.${field}`, received: -1, rule: 'must be greater than 0' });
  });
  it.each(fields)('rejects a non-integer %s', (field) => {
    expect(configurationIssues(withRunner({ [field]: 1.5 }))).toContainEqual({ path: `runner.${field}`, received: 1.5, rule: 'must be an integer' });
  });
  it('rejects a session ceiling above the total ceiling', () => {
    expect(configurationIssues(withRunner({ maxSessionMinutes: 61, maxTotalMinutes: 60 }))).toEqual([{ path: 'runner.maxSessionMinutes', received: 61, rule: 'must be less than or equal to maxTotalMinutes' }]);
  });
  it('rejects the default session ceiling when the total ceiling is lowered below it', () => {
    const issues = configurationIssues(withRunner({ maxTotalMinutes: 10 }));
    expect(issues.map(({ path, rule }) => ({ path, rule }))).toEqual([{ path: 'runner.maxSessionMinutes', rule: 'must be less than or equal to maxTotalMinutes' }]);
  });
  it('rejects unknown runner keys, including a key that disables command confirmation (DEC-10)', () => {
    const issues = configurationIssues(withRunner({ skipCommandConfirmation: true }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe('runner');
  });
});
