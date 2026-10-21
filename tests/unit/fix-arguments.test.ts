import { describe, expect, it } from 'vitest';
import { CliArgumentError } from '../../src/cli/argument-validator.js';
import { parseFix } from '../../src/cli/fix-arguments.js';

describe('fix arguments (DEC-09, TC-09)', () => {
  it('parses the defaults', () => {
    expect(parseFix([])).toEqual({ command: 'fix', dryRun: false, yes: false, force: false, json: false, harness: [] });
  });
  it('parses every flag together', () => {
    expect(parseFix(['-y', '--force', '--json', '--harness', 'claude-code', '--harness', 'pi'])).toEqual({ command: 'fix', dryRun: false, yes: true, force: true, json: true, harness: ['claude-code', 'pi'] });
    expect(parseFix(['--dry-run', '--json', '--force']).dryRun).toBe(true);
  });
  it.each([[['--json']], [['--force']], [['--harness', 'unknown']]])('rejects %j as invalid arguments (FR-13, FR-14)', (args) => {
    expect(() => parseFix(args)).toThrow(CliArgumentError);
  });
  it('rejects an unknown flag', () => {
    expect(() => parseFix(['--verbose'])).toThrow();
  });
});
