import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { confirmWithPort, ReadlinePromptPort } from '../../src/cli/assistant/prompt-port.js';
import { parseInit } from '../../src/cli/init-arguments.js';
import { assertTerminalForAssistant, NOT_INTERACTIVE_MESSAGE, shouldRunAssistant } from '../../src/cli/terminal.js';
import { ScriptedPrompts } from '../helpers/scripted-prompts.js';

const TTY = { stdinIsTty: true, stdoutIsTty: true };
const PIPED_INPUT = { stdinIsTty: false, stdoutIsTty: true };
const PIPED_OUTPUT = { stdinIsTty: true, stdoutIsTty: false };

describe('assistant trigger rule (prd-16 FR-01, FR-08, TC-04)', () => {
  it.each([[[]], [['--dry-run']]])('starts on a terminal for %j (FR-01, TC-04)', (args) => {
    expect(shouldRunAssistant(parseInit(args), TTY)).toBe(true);
  });
  it.each([[['--yes']], [['--json']], [['--harness', 'cursor']], [['--max-restarts', '3', '--auto-restart']], [['--debug']]])('does not start for %j (FR-01, FR-08, TC-04)', (args) => {
    expect(shouldRunAssistant(parseInit(args), TTY)).toBe(false);
  });
  it.each([[PIPED_INPUT], [PIPED_OUTPUT], [{ stdinIsTty: false, stdoutIsTty: false }]])('does not start without both streams as terminals: %j (FR-01, FR-10, TC-04)', (terminal) => {
    expect(shouldRunAssistant(parseInit([]), terminal)).toBe(false);
  });
  it('--interactive forces the assistant (FR-01, TC-04)', () => {
    expect(shouldRunAssistant(parseInit(['--interactive']), TTY)).toBe(true);
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

describe('prompt port (prd-16 NFR-01, NFR-03, TC-04)', () => {
  it('answers from a scripted port and returns null when the script ends (NFR-03, TC-04)', async () => {
    const prompts = new ScriptedPrompts(['y']);
    expect(await confirmWithPort(prompts, 'Apply?')).toBe(true);
    expect(await confirmWithPort(prompts, 'Apply?')).toBe(false);
    expect(prompts.asked).toEqual(['Apply? [y/N] ', 'Apply? [y/N] ']);
  });
  it('reads a line through readline and returns null at end of input (NFR-01, TC-04)', async () => {
    const input = new PassThrough();
    const port = new ReadlinePromptPort(input, new PassThrough());
    const first = port.ask('Name? ');
    input.write('claude-code\n');
    expect(await first).toBe('claude-code');
    const second = port.ask('Next? ');
    input.end();
    expect(await second).toBeNull();
    expect(await port.ask('Again? ')).toBeNull();
  });
});
