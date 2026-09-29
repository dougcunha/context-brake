import { stat } from 'node:fs/promises';
import { win32 } from 'node:path';
import process from 'node:process';
import type { StatuslineShell } from '../../../core/contracts/statusline-line.js';

export type ShellInvocation = { readonly label: StatuslineShell; readonly executables: readonly string[]; readonly args: readonly string[] };
export type ShellHost = { readonly platform: NodeJS.Platform; readonly environment: NodeJS.ProcessEnv; readonly isFile: (path: string) => Promise<boolean> };

const POSIX_SHELL = '/bin/sh';
const BASH_EXECUTABLE = 'bash.exe';
const POWERSHELL_EXECUTABLES = ['pwsh.exe', 'powershell.exe'] as const;
const POWERSHELL_ENCODING = 'utf16le';

export const processShellHost: ShellHost = { platform: process.platform, environment: process.env, isFile: isExistingFile };

export async function resolveStatuslineShell(command: string, host: ShellHost = processShellHost): Promise<ShellInvocation> {
  if (host.platform !== 'win32') return { label: 'sh', executables: [POSIX_SHELL], args: ['-c', command] };
  const bash = host.environment['MSYSTEM'] === undefined ? null : await findGitBash(host);
  if (bash !== null) return { label: 'git-bash', executables: [bash], args: ['-c', command] };
  return { label: 'powershell', executables: POWERSHELL_EXECUTABLES, args: ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(command, POWERSHELL_ENCODING).toString('base64')] };
}

async function findGitBash(host: ShellHost): Promise<string | null> {
  const { EXEPATH: exePath, SHELL: shell, CLAUDE_CODE_GIT_BASH_PATH: configured } = host.environment;
  const candidates = [exePath === undefined ? undefined : win32.join(exePath, BASH_EXECUTABLE), shell, configured];
  for (const candidate of candidates) {
    if (candidate !== undefined && win32.basename(candidate).toLowerCase() === BASH_EXECUTABLE && (await host.isFile(candidate))) return candidate;
  }
  return null;
}

async function isExistingFile(path: string): Promise<boolean> {
  return stat(path).then((entry) => entry.isFile(), () => false);
}
