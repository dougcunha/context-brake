import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CliRunResult } from './cli-runner.js';

export type ShellType = 'powershell' | 'bash' | 'native';

function findBashPath(): string | null {
  if (process.platform !== 'win32') return '/bin/sh';
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\Users\\Admin\\scoop\\apps\\git\\current\\bin\\bash.exe',
    'C:\\Users\\Admin\\scoop\\apps\\git\\current\\usr\\bin\\bash.exe',
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
    child.on('close', (code) => { res({ code, stdout, stderr }); });
  });
}
