import { describe, expect, it } from 'vitest';
import { CliArgumentError, parseCliArgs } from '../../src/cli/argument-parser.js';
import { resolveRunLimits } from '../../src/cli/run-arguments.js';
import { RUNNER_DEFAULTS } from '../../src/core/contracts/runner-configuration.js';

describe('run arguments (DEC-08, DEC-18, CMP-20)', () => {
  it('parses the harness, approvals, JSON, and every limit override', () => {
    const args = ['run', '--harness', 'codex-cli', '--approve-commands', '--approve-steps', '--json', '--max-sessions', '5', '--max-minutes', '60', '--max-session-minutes', '10', '--max-tokens', '900000', '--validation-timeout', '30', '--max-failures', '3'];
    expect(parseCliArgs(args)).toEqual({
      command: 'run', harness: 'codex-cli', approveCommands: true, approveSteps: true, json: true, harnessArgs: [],
      overrides: { maxSessions: 5, maxTotalMinutes: 60, maxSessionMinutes: 10, maxTotalTokens: 900000, validationTimeoutSeconds: 30, maxConsecutiveFailures: 3 },
    });
  });

  it('defaults to no approvals, text output, and no overrides', () => {
    expect(parseCliArgs(['run', '--harness', 'claude-code'])).toEqual({ command: 'run', harness: 'claude-code', approveCommands: false, approveSteps: false, json: false, harnessArgs: [], overrides: {} });
  });

  it('takes the token after --harness-arg verbatim, even when it starts with a dash, and accepts the = form', () => {
    const parsed = parseCliArgs(['run', '--harness-arg', '--permission-mode', '--harness', 'claude-code', '--harness-arg=acceptEdits', '--harness-arg', '--json']);
    expect(parsed).toMatchObject({ harnessArgs: ['--permission-mode', 'acceptEdits', '--json'], json: false });
  });

  it.each([
    ['a missing harness', ['run'], "Option '--harness' is required for run"],
    ['an unknown harness', ['run', '--harness', 'vim'], "Unknown harness 'vim'."],
    ['a non-integer limit', ['run', '--harness', 'claude-code', '--max-sessions', '2.5'], "Option '--max-sessions' must be a positive integer, received '2.5'."],
    ['a zero limit', ['run', '--harness', 'claude-code', '--max-failures', '0'], "Option '--max-failures' must be a positive integer"],
    ['a trailing --harness-arg', ['run', '--harness', 'claude-code', '--harness-arg'], "Option '--harness-arg' needs a value"],
    ['an unknown option', ['run', '--harness', 'claude-code', '--yes'], "Unknown option '--yes'"],
  ])('rejects %s with INVALID_ARGUMENTS', (_case, args, message) => {
    expect(() => parseCliArgs(args)).toThrow(CliArgumentError);
    expect(() => parseCliArgs(args)).toThrow(message);
  });
});

describe('run limit resolution (DEC-08, DEC-09)', () => {
  it('applies overrides over the configured runner section', () => {
    expect(resolveRunLimits({ ...RUNNER_DEFAULTS }, { maxSessions: 5, validationTimeoutSeconds: 1 })).toEqual({ ...RUNNER_DEFAULTS, maxSessions: 5, validationTimeoutSeconds: 1 });
  });

  it('rejects a session limit above the total limit after overrides', () => {
    expect(() => resolveRunLimits({ ...RUNNER_DEFAULTS }, { maxTotalMinutes: 10 })).toThrow(CliArgumentError);
    expect(() => resolveRunLimits({ ...RUNNER_DEFAULTS }, { maxTotalMinutes: 10 })).toThrow('maxSessionMinutes must be less than or equal to maxTotalMinutes');
  });
});
