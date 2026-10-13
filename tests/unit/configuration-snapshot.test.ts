import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { parseConfiguration } from '../../src/core/validation/configuration-validator.js';
import { configurationIssues } from '../helpers/configuration-issues.js';

const SHAPE = 'use lowercase letters, digits, and single hyphens, up to 64 characters, optionally prefixed by a plugin name and a colon';

describe('single-mode configuration (prd-12 FR-02, FR-04, TC-04)', () => {
  it('requires a snapshot command for a resume command (prd-12 FR-04, TC-04)', () => {
    const issues = configurationIssues({ ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED', resumeCommand: 'r' } });
    expect(issues).toContainEqual(expect.objectContaining({ path: 'snapshot.resumeCommand', rule: 'requires snapshot.command' }));
  });
  it('defaults the snapshot section to a RED trigger without commands (prd-12 FR-04)', () => {
    const file: Record<string, unknown> = { ...DEFAULT_CONFIG };
    delete file['snapshot'];
    expect(parseConfiguration(file).snapshot).toEqual({ triggerZone: 'RED' });
  });
});

describe('skill names in the snapshot section (prd-19 FR-01, FR-02, TC-01, TC-02)', () => {
  it.each([
    { case: 'a leading slash', command: '/sdd-snapshot', rule: '"/sdd-snapshot" is not a skill name; use the bare name sdd-snapshot' },
    { case: 'a leading dollar', command: '$sdd-snapshot', rule: '"$sdd-snapshot" is not a skill name; use the bare name sdd-snapshot' },
    { case: 'a leading at sign', command: '@sdd-snapshot', rule: '"@sdd-snapshot" is not a skill name; use the bare name sdd-snapshot' },
    { case: 'a space', command: 'sdd snapshot', rule: `"sdd snapshot" is not a skill name; ${SHAPE}` },
    { case: 'two lines', command: 'a\nb', rule: `"a\nb" is not a skill name; ${SHAPE}` },
    { case: 'an empty value', command: '', rule: 'must not be empty' },
    { case: 'a sigil on an invalid remainder', command: '/Sdd', rule: `"/Sdd" is not a skill name; ${SHAPE}` },
  ])('rejects $case with the key and a fix (FR-02, TC-02)', ({ command, rule }) => {
    const issues = configurationIssues({ ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED', command } });
    expect(issues.map((issue) => [issue.path, issue.rule])).toEqual([['snapshot.command', rule]]);
  });
  it('applies the same rule to the resume command (FR-02, TC-02)', () => {
    const issues = configurationIssues({ ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED', command: 'sdd-snapshot', resumeCommand: '/sdd-orchestrate-flow' } });
    expect(issues.map((issue) => [issue.path, issue.rule])).toEqual([['snapshot.resumeCommand', '"/sdd-orchestrate-flow" is not a skill name; use the bare name sdd-orchestrate-flow']]);
  });
  it('accepts bare names for both commands (FR-01, TC-01)', () => {
    const parsed = parseConfiguration({ ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED', command: 'sdd-snapshot', resumeCommand: 'anthropic-skills:docs' } });
    expect(parsed.snapshot).toEqual({ triggerZone: 'RED', command: 'sdd-snapshot', resumeCommand: 'anthropic-skills:docs' });
  });
});
