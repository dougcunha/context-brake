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

export type ShellCandidate = { readonly label: 'sh' | 'git-bash' | 'powershell'; readonly executable: string; readonly args: (command: string) => readonly string[]; readonly environment: NodeJS.ProcessEnv };

const GIT_BASH_CANDIDATES = [process.env['CLAUDE_CODE_GIT_BASH_PATH'], process.env['EXEPATH'] === undefined ? undefined : `${process.env['EXEPATH']}\bash.exe`, 'C:/Program Files/Git/bin/bash.exe'];
const POWERSHELL_EXECUTABLES = ['pwsh.exe', 'powershell.exe'];

const GIT_BASH_MARKERS = new Set(['MSYSTEM', 'EXEPATH', 'SHELL']);

function withoutGitBashMarkers(): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(process.env).filter(([name]) => !GIT_BASH_MARKERS.has(name)));
}
function runs(executable: string, args: readonly string[], environment: NodeJS.ProcessEnv): boolean {
  return spawnSync(executable, [...args], { stdio: 'ignore', env: environment }).status === 0;
}

export function findStatuslineShells(): ShellCandidate[] {
  if (process.platform !== 'win32') return runs('sh', ['-c', 'exit 0'], process.env) ? [{ label: 'sh', executable: 'sh', args: (command) => ['-c', command], environment: process.env }] : [];
  const bash = GIT_BASH_CANDIDATES.find((candidate) => candidate !== undefined && runs(candidate, ['-c', 'exit 0'], withoutGitBashMarkers()));
  const bashShells: ShellCandidate[] = bash === undefined ? [] : [{ label: 'git-bash', executable: bash, args: (command) => ['-c', command], environment: withoutGitBashMarkers() }];
  const powershells = POWERSHELL_EXECUTABLES.filter((executable) => runs(executable, ['-NoProfile', '-Command', 'exit 0'], withoutGitBashMarkers()));
  return [...bashShells, ...powershells.map((executable): ShellCandidate => ({ label: 'powershell', executable, args: (command) => ['-NoProfile', '-Command', command], environment: withoutGitBashMarkers() }))];
}

export function runInShellCandidate(shell: ShellCandidate, command: string, stdin: string): Promise<ShellRun> {
  const child = spawn(shell.executable, [...shell.args(command)], { stdio: ['pipe', 'pipe', 'ignore'], env: shell.environment, windowsHide: true });
  const chunks: Buffer[] = [];
  child.stdout.on('data', (data: Buffer) => { chunks.push(data); });
  child.stdin.on('error', () => undefined);
  child.stdin.end(stdin);
  return new Promise((resolvePromise) => { child.on('close', (code) => resolvePromise({ code, stdout: Buffer.concat(chunks) })); });
}
