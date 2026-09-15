export const SHELL_OPERATOR_PATTERN = /[;&|`<>\r\n]|\$\(/;
export const GIT_VERBS: readonly string[] = ['status', 'add', 'commit'];

export type ShellAllowlist = {
  readonly validationCommand: string | null;
  readonly additionalCommands: readonly string[];
};

export function commandTokens(command: string): string[] {
  return command.trim().split(/\s+/).filter((token) => token.length > 0);
}
export function hasShellOperators(command: string): boolean {
  return SHELL_OPERATOR_PATTERN.test(command);
}
export function isGitStatusAddOrCommit(command: string): boolean {
  const tokens = commandTokens(command);
  return tokens[0] === 'git' && GIT_VERBS.includes(tokens[1] ?? '');
}
export function matchesValidationCommand(command: string, validationCommand: string | null): boolean {
  const trimmed = command.trim();
  return trimmed !== '' && validationCommand !== null && trimmed === validationCommand.trim();
}
export function matchesLeadingTokens(command: string, entry: string): boolean {
  const commandParts = commandTokens(command);
  const entryParts = commandTokens(entry);
  if (entryParts.length === 0 || commandParts.length < entryParts.length) return false;
  return entryParts.every((token, index) => commandParts[index] === token);
}
export function isAllowedShellCommand(command: string, allowlist: ShellAllowlist): boolean {
  if (hasShellOperators(command)) return false;
  if (isGitStatusAddOrCommit(command)) return true;
  if (matchesValidationCommand(command, allowlist.validationCommand)) return true;
  return allowlist.additionalCommands.some((entry) => matchesLeadingTokens(command, entry));
}
