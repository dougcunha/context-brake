import { describe, expect, it } from 'vitest';
import { parseInit } from '../../src/cli/init-arguments.js';
import { assertTerminalForAssistant, NOT_INTERACTIVE_MESSAGE, shouldRunAssistant } from '../../src/cli/terminal.js';

const TTY = { stdinIsTty: true, stdoutIsTty: true };
const PIPED_INPUT = { stdinIsTty: false, stdoutIsTty: true };
const PIPED_OUTPUT = { stdinIsTty: true, stdoutIsTty: false };

describe('assistant trigger rule (prd-16 FR-01, FR-08, TC-04)', () => {
  it('starts on a terminal without flags (FR-01, TC-04)', () => {
    expect(shouldRunAssistant(parseInit([]), TTY)).toBe(true);
  });
  it.each([[['--yes']], [['--json']], [['--harness', 'cursor']]])('does not start for %j (FR-01, FR-08, TC-04)', (args) => {
    expect(shouldRunAssistant(parseInit(args), TTY)).toBe(false);
  });
  it.each([[PIPED_INPUT], [PIPED_OUTPUT]])('does not start without both streams as terminals: %j (FR-01, FR-10, TC-04)', (terminal) => {
    expect(shouldRunAssistant(parseInit([]), terminal)).toBe(false);
  });
  it('--interactive forces the assistant even with a configuration flag (FR-01, TC-04)', () => {
    expect(shouldRunAssistant(parseInit(['--interactive', '--harness', 'cursor']), TTY)).toBe(true);
  });
});

describe('--interactive terminal gate (prd-16 FR-01, FR-10, TC-04)', () => {
  it.each([[PIPED_INPUT], [PIPED_OUTPUT]])('refuses %j with the not-interactive message (FR-01, FR-10, TC-04)', (terminal) => {
    expect(() => assertTerminalForAssistant(parseInit(['--interactive']), terminal)).toThrow(NOT_INTERACTIVE_MESSAGE);
  });
  it('accepts a terminal and ignores runs without --interactive (FR-01, TC-04)', () => {
    expect(() => assertTerminalForAssistant(parseInit(['--interactive']), TTY)).not.toThrow();
    expect(() => assertTerminalForAssistant(parseInit([]), PIPED_INPUT)).not.toThrow();
  });
});
