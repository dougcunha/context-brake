import { spawn, spawnSync } from 'node:child_process';

export type ShellRun = { readonly code: number | null; readonly stdout: Buffer };

const WINDOWS_SHELL_CANDIDATES = ['C:/Program Files/Git/bin/sh.exe', 'C:/Program Files/Git/usr/bin/sh.exe'];

export function findPosixShell(): string | null {
  const candidates = process.platform === 'win32' ? ['sh', ...WINDOWS_SHELL_CANDIDATES] : ['sh'];
  return candidates.find((candidate) => spawnSync(candidate, ['-c', 'exit 0'], { stdio: 'ignore' }).status === 0) ?? null;
}

export function runInShell(shell: string, command: string, stdin: string): Promise<ShellRun> {
  const child = spawn(shell, ['-c', command], { stdio: ['pipe', 'pipe', 'ignore'] });
  const chunks: Buffer[] = [];
  child.stdout.on('data', (data: Buffer) => { chunks.push(data); });
  child.stdin.on('error', () => undefined);
  child.stdin.end(stdin);
  return new Promise((resolvePromise) => { child.on('close', (code) => resolvePromise({ code, stdout: Buffer.concat(chunks) })); });
}
