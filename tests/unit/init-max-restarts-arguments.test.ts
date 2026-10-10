import { describe, expect, it } from 'vitest';
import { CliArgumentError } from '../../src/cli/argument-validator.js';
import { hasConfigurationFlag, parseInit } from '../../src/cli/init-arguments.js';

describe('--max-restarts parsing (prd-16 FR-09, TC-01)', () => {
  it.each([['1', 1], ['10', 10]])('accepts %s (FR-09, TC-01)', (value, expected) => {
    expect(parseInit(['--auto-restart', '--max-restarts', value]).maxRestarts).toBe(expected);
  });
  it.each(['0', '11', '2.5'])('rejects %j naming the 1 to 10 rule (FR-09, TC-01)', (value) => {
    expect(() => parseInit(['--auto-restart', `--max-restarts=${value}`])).toThrow('integer from 1 to 10');
  });
  it('rejects --max-restarts with --no-auto-restart (FR-09, TC-01)', () => {
    expect(() => parseInit(['--no-auto-restart', '--max-restarts', '3'])).toThrow('cannot be combined with --no-auto-restart');
  });
});

describe('--interactive parsing and configuration flags (prd-16 FR-01, TC-03)', () => {
  it.each([['--yes'], ['--json']])('rejects --interactive with %s naming both flags (FR-01, TC-03)', (flag) => {
    expect(() => parseInit(['--interactive', flag])).toThrow(CliArgumentError);
    expect(() => parseInit(['--interactive', flag])).toThrow(`--interactive cannot be combined with ${flag}.`);
  });
  it('accepts --interactive with --dry-run (FR-01, TC-03)', () => {
    expect(parseInit(['--interactive', '--dry-run']).interactive).toBe(true);
  });
  it.each([
    [['--harness', 'cursor']], [['--exclude-harness', 'cursor']], [['--snapshot-command', '/s']], [['--snapshot-trigger', 'RED']],
    [['--resume-command', '/r']], [['--no-snapshot-command']], [['--debug']], [['--no-debug']], [['--statusline-bridge']],
    [['--auto-restart']], [['--no-auto-restart']], [['--max-restarts', '3']],
  ])('counts %j as a configuration flag (FR-01, TC-03)', (args) => {
    expect(hasConfigurationFlag(parseInit(args))).toBe(true);
  });
  it.each([[[]], [['--dry-run']]])('does not count %j (FR-01, TC-03)', (args) => {
    expect(hasConfigurationFlag(parseInit(args))).toBe(false);
  });
});
