import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { parseConfiguration } from '../../src/core/validation/configuration-validator.js';
import { configurationIssues } from '../helpers/configuration-issues.js';

const ZOD_DEFAULT_RULE = 'Invalid input';

describe('single-mode configuration (prd-12 FR-02, FR-04, TC-04)', () => {
  it('requires a snapshot command for a resume command (prd-12 FR-04, TC-04)', () => {
    const issues = configurationIssues({ ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED', resumeCommand: '/r' } });
    expect(issues).toContainEqual(expect.objectContaining({ path: 'snapshot.resumeCommand', rule: 'requires snapshot.command' }));
  });
  it('defaults the snapshot section to a RED trigger without commands (prd-12 FR-04)', () => {
    const file: Record<string, unknown> = { ...DEFAULT_CONFIG };
    delete file['snapshot'];
    expect(parseConfiguration(file).snapshot).toEqual({ triggerZone: 'RED' });
  });
  it.each([
    { case: '200 characters', command: 'x'.repeat(200), rules: [] },
    { case: '201 characters', command: 'x'.repeat(201), rules: [ZOD_DEFAULT_RULE] },
    { case: 'an empty command', command: '', rules: [ZOD_DEFAULT_RULE] },
    { case: 'a leading space', command: ' /s', rules: ['must not have leading or trailing whitespace'] },
    { case: 'two lines', command: '/s\n/t', rules: ['must be a single line'] },
  ])('applies the snapshot command rules to $case (prd-12 FR-04)', ({ command, rules }) => {
    const issues = configurationIssues({ ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED', command } });
    expect(issues.map((issue) => [issue.path, issue.rule])).toEqual(rules.map((rule) => ['snapshot.command', rule]));
  });
});
