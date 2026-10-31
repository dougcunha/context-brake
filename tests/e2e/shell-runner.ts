import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { CliRunResult } from './cli-runner.js';

export type ShellType = 'powershell' | 'bash' | 'native';

// Git for Windows from the official installer or from Scoop, in the current user's profile.
const SCOOP_GIT = join(homedir(), 'scoop', 'apps', 'git', 'current');

export function findBashPath(): string | null {
  if (process.platform !== 'win32') return '/bin/sh';
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    join(SCOOP_GIT, 'bin', 'bash.exe'),
    join(SCOOP_GIT, 'usr', 'bin', 'bash.exe'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function buildShellCommand(type: ShellType, cliPath: string, args: readonly string[]): { cmd: string; cmdArgs: string[] } {
  const nodeBin = process.execPath;
  const quotedArgs = args.join(' ');
  if (type === 'powershell') {
    return {
      cmd: 'powershell.exe',
      cmdArgs: ['-NoProfile', '-NonInteractive', '-Command', `& '${nodeBin}' '${cliPath}' ${quotedArgs}`],
    };
  }
  if (type === 'bash') {
    const bashPath = findBashPath() ?? 'bash';
    return {
      cmd: bashPath,
      cmdArgs: ['-c', `"${nodeBin}" "${cliPath}" ${quotedArgs}`],
    };
  }
  return { cmd: nodeBin, cmdArgs: [cliPath, ...args] };
}

export function runInShell(type: ShellType, args: readonly string[], cwd: string): Promise<CliRunResult> {
  return new Promise((res) => {
    const cliPath = resolve('dist/src/cli/main.js');
    const { cmd, cmdArgs } = buildShellCommand(type, cliPath, args);
    const child = spawn(cmd, cmdArgs, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    // A shell that cannot start emits 'error' and never 'close'; report it instead of hanging until the timeout.
    child.on('error', (error) => { res({ code: null, stdout, stderr: stderr + String(error) }); });
    child.on('close', (code) => { res({ code, stdout, stderr }); });
  });
}
