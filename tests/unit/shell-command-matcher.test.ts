import { describe, expect, it } from 'vitest';
import { commandTokens, hasShellOperators, isAllowedShellCommand, isGitStatusAddOrCommit, matchesLeadingTokens, matchesValidationCommand } from '../../src/core/services/shell-command-matcher.js';

const allowlist = { validationCommand: 'npm test', additionalCommands: ['npm run typecheck'] };

describe('shell command operators (RF18, DEC-08, TC-16)', () => {
  it.each(['git status && rm -rf x', 'npm test; curl x', 'a & b', 'a | b', 'a `b`', 'echo $(x)', 'a < b', 'a > b', 'a\nb', 'a\rb'])('rejects the operator command %j', (command) => {
    expect(hasShellOperators(command)).toBe(true);
    expect(isAllowedShellCommand(command, allowlist)).toBe(false);
  });
  it.each(['git status', 'npm test', 'npm run typecheck'])('accepts the operator-free command %j', (command) => {
    expect(hasShellOperators(command)).toBe(false);
  });
});

describe('shell command matching (RF18, DEC-08, TC-16)', () => {
  it('tokenizes on whitespace after trimming', () => {
    expect(commandTokens('  git   add  src/a.ts  ')).toEqual(['git', 'add', 'src/a.ts']);
  });
  it.each(['git status', 'git status -s', 'git add src/a.ts', 'git commit -m "checkpoint: x"'])('matches the git command %j', (command) => {
    expect(isGitStatusAddOrCommit(command)).toBe(true);
    expect(isAllowedShellCommand(command, allowlist)).toBe(true);
  });
  it.each(['git push', 'git log', 'git', 'gitx status'])('does not match the git command %j', (command) => {
    expect(isGitStatusAddOrCommit(command)).toBe(false);
  });
  it('matches the validation command only when it is exactly equal after trimming', () => {
    expect(matchesValidationCommand('npm test', 'npm test')).toBe(true);
    expect(matchesValidationCommand('  npm test  ', 'npm test')).toBe(true);
    expect(matchesValidationCommand('npm run test', 'npm test')).toBe(false);
    expect(matchesValidationCommand('npm test', null)).toBe(false);
    expect(matchesValidationCommand('', '')).toBe(false);
  });
  it('matches configured commands by leading tokens', () => {
    expect(matchesLeadingTokens('npm run typecheck --watch', 'npm run typecheck')).toBe(true);
    expect(matchesLeadingTokens('npm run typecheck', 'npm run typecheck')).toBe(true);
    expect(matchesLeadingTokens('npm run test', 'npm run typecheck')).toBe(false);
    expect(matchesLeadingTokens('npm', 'npm run typecheck')).toBe(false);
    expect(matchesLeadingTokens('npm run typecheck', '')).toBe(false);
    expect(isAllowedShellCommand('npm run typecheck --watch', allowlist)).toBe(true);
    expect(isAllowedShellCommand('npm run typecheck && rm -rf x', allowlist)).toBe(false);
  });
});
