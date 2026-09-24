import { describe, expect, it } from 'vitest';
import { CliArgumentError, parseCliArgs } from '../../src/cli/argument-parser.js';
import { buildCliErrorDocument } from '../../src/core/services/report-service.js';

describe('wrap arguments (TC-16, DEC-19)', () => {
  it('takes everything after -- as the command, including its own options', () => {
    expect(parseCliArgs(['wrap', '--', 'npm', 'test', '--', '--json'])).toEqual({ command: 'wrap', json: false, argv: ['npm', 'test', '--', '--json'] });
  });

  it.each([
    ['no separator', ['wrap', 'npm', 'test'], "needs '--'"],
    ['an option before the separator', ['wrap', '--json', '--', 'npm'], "needs '--'"],
    ['no command after the separator', ['wrap', '--'], "No command follows '--'"],
    ['a blank command', ['wrap', '--', ' '], "No command follows '--'"],
  ])('rejects %s with INVALID_ARGUMENTS', (_case, args, message) => {
    expect(() => parseCliArgs(args)).toThrow(CliArgumentError);
    expect(() => parseCliArgs(args)).toThrow(message);
  });

  it('lists wrap among the allowed commands', () => {
    expect(() => parseCliArgs(['unknown'])).toThrow('Allowed commands: init, doctor, remove, plan, run, wrap.');
  });

  it('builds an error document for the wrap command', () => {
    expect(buildCliErrorDocument({ command: 'wrap', code: 'INVALID_ARGUMENTS', message: 'x' })).toMatchObject({ command: 'wrap', exitCode: 64 });
  });
});
