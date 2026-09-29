import { describe, expect, it } from 'vitest';
import { resolveStatuslineShell, type ShellHost } from '../../src/infrastructure/harnesses/claude-code/statusline-shell.js';

const COMMAND = `ccstatusline --format "a b"`;
const GIT_BIN = 'C:\\Program Files\\Git\\bin';
const GIT_BASH = `${GIT_BIN}\\bash.exe`;
const SCOOP_BASH = 'C:\\Users\\dev\\scoop\\apps\\git\\current\\bin\\bash.exe';

function host(platform: NodeJS.Platform, environment: NodeJS.ProcessEnv, files: readonly string[] = []): ShellHost {
  return { platform, environment, isFile: async (path) => files.includes(path) };
}
function decode(args: readonly string[]): string {
  return Buffer.from(args.at(-1) ?? '', 'base64').toString('utf16le');
}

describe('status line shell resolution (FR-02, DEC-02, TC-03)', () => {
  it('uses sh outside Windows', async () => {
    expect(await resolveStatuslineShell(COMMAND, host('linux', { MSYSTEM: 'MINGW64' }))).toEqual({ label: 'sh', executables: ['/bin/sh'], args: ['-c', COMMAND] });
  });
  it('uses the Git Bash that launched the bridge, found through EXEPATH', async () => {
    const shell = await resolveStatuslineShell(COMMAND, host('win32', { MSYSTEM: 'MINGW64', EXEPATH: GIT_BIN }, [GIT_BASH]));
    expect(shell).toEqual({ label: 'git-bash', executables: [GIT_BASH], args: ['-c', COMMAND] });
  });
  it('falls back to SHELL and then to CLAUDE_CODE_GIT_BASH_PATH', async () => {
    expect((await resolveStatuslineShell(COMMAND, host('win32', { MSYSTEM: 'UCRT64', SHELL: SCOOP_BASH }, [SCOOP_BASH]))).executables).toEqual([SCOOP_BASH]);
    expect((await resolveStatuslineShell(COMMAND, host('win32', { MSYSTEM: 'UCRT64', SHELL: '/usr/bin/bash', CLAUDE_CODE_GIT_BASH_PATH: SCOOP_BASH }, [SCOOP_BASH]))).executables).toEqual([SCOOP_BASH]);
  });
  it('uses PowerShell when the bridge was not launched by Git Bash', async () => {
    const shell = await resolveStatuslineShell(COMMAND, host('win32', { CLAUDE_CODE_GIT_BASH_PATH: SCOOP_BASH }, [SCOOP_BASH]));
    expect(shell.label).toBe('powershell');
    expect(shell.executables).toEqual(['pwsh.exe', 'powershell.exe']);
    expect(shell.args.slice(0, 3)).toEqual(['-NoProfile', '-NonInteractive', '-EncodedCommand']);
    expect(decode(shell.args)).toBe(COMMAND);
  });
  it('uses PowerShell when the Git Bash markers point to no bash.exe', async () => {
    expect((await resolveStatuslineShell(COMMAND, host('win32', { MSYSTEM: 'MINGW64', EXEPATH: GIT_BIN }))).label).toBe('powershell');
    expect((await resolveStatuslineShell(COMMAND, host('win32', { MSYSTEM: 'MINGW64', SHELL: 'C:\\tools\\zsh.exe' }, ['C:\\tools\\zsh.exe']))).label).toBe('powershell');
  });
});
