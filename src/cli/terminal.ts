import { CliArgumentError } from './argument-validator.js';
import { hasConfigurationFlag, type ParsedInitArgs } from './init-arguments.js';

export type TerminalInfo = { readonly stdinIsTty: boolean; readonly stdoutIsTty: boolean };

export const NOT_INTERACTIVE_MESSAGE = 'The terminal is not interactive (stdin or stdout is not a TTY). Use flags such as --harness, --snapshot-command, --auto-restart, --max-restarts, or --yes.';

export function detectTerminal(): TerminalInfo {
  return { stdinIsTty: process.stdin.isTTY === true, stdoutIsTty: process.stdout.isTTY === true };
}

function isInteractiveTerminal(terminal: TerminalInfo): boolean {
  return terminal.stdinIsTty && terminal.stdoutIsTty;
}

export function shouldRunAssistant(args: ParsedInitArgs, terminal: TerminalInfo): boolean {
  if (args.interactive === true) return true;
  return isInteractiveTerminal(terminal) && !args.yes && !args.json && !hasConfigurationFlag(args);
}

export function assertTerminalForAssistant(args: ParsedInitArgs, terminal: TerminalInfo): void {
  if (args.interactive === true && !isInteractiveTerminal(terminal)) throw new CliArgumentError(NOT_INTERACTIVE_MESSAGE);
}
