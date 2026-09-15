import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { ToolCall } from '../contracts/runtime.js';
import { isAllowedShellCommand, type ShellAllowlist } from './shell-command-matcher.js';

export type AllowlistInput = {
  readonly config: ContextBrakeConfig;
  readonly validationCommand: string | null;
};

export function shellAllowlist(input: AllowlistInput): ShellAllowlist {
  return { validationCommand: input.validationCommand, additionalCommands: input.config.brake.additionalAllowedCommands };
}
export function isToolCallAllowed(call: ToolCall, input: AllowlistInput): boolean {
  if (call.category === 'file_read' || call.category === 'file_write') return touchesOnlyStateFiles(call, input.config);
  if (call.category !== 'shell' || call.command === null) return false;
  return isAllowedShellCommand(call.command, shellAllowlist(input));
}
function touchesOnlyStateFiles(call: ToolCall, config: ContextBrakeConfig): boolean {
  const allowed = new Set([config.stateStorage.planFile, config.stateStorage.checkpointFile]);
  return call.paths.length > 0 && call.paths.every((path) => allowed.has(path));
}
