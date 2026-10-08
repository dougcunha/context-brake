import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODEX_CONFIG_FILE, CODEX_HOOK_FILE, planCodexInstall } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { attemptExecutable, attemptGitProcess, requireProcess } from '../helpers/process-capability.js';

const IS_WINDOWS = process.platform === 'win32';
const HOOK_ASSET = 'dist/assets/runtime/codex-cli-hook.mjs';
const EXEC_TIMEOUT_MS = 15000;
const EVENTS = ['PostToolUse', 'SessionStart', 'Stop'] as const;
const HOOK_RAN_MARKER = 'ContextBrake: PAYLOAD_INVALID';
type ShellResult = { readonly code: number | null; readonly stdout: string; readonly stderr: string };
type Shell = { readonly file: string; readonly probe: string[]; readonly build: (command: string) => string[]; readonly verbatim?: boolean };
type CodexHook = { command?: string; commandWindows?: string };
type CodexConfig = { hooks?: Record<string, { hooks?: CodexHook[] }[]> };
const WINDOWS_SHELLS: Record<string, Shell> = {
  'cmd.exe /C (Codex default)': { file: process.env.COMSPEC ?? 'cmd.exe', probe: ['/C', 'exit 0'], build: (command) => ['/C', `"${command}"`], verbatim: true },
  'pwsh -Command': { file: 'pwsh', probe: powershellArguments('exit 0'), build: powershellArguments },
  'powershell.exe -Command': { file: 'powershell.exe', probe: powershellArguments('exit 0'), build: powershellArguments },
};
const POSIX_SHELLS: Record<string, Shell> = {
  'sh -lc': { file: 'sh', probe: ['-c', 'exit 0'], build: (command) => ['-lc', command] },
  'bash -lc': { file: 'bash', probe: ['-c', 'exit 0'], build: (command) => ['-lc', command] },
};
const SHELLS = IS_WINDOWS ? WINDOWS_SHELLS : POSIX_SHELLS;
let repoRoot = '';
let repoSubDir = '';

function powershellArguments(command: string): string[] {
  return ['-NoProfile', '-Command', command];
}
function execShell(shell: Shell, command: string, cwd: string): Promise<ShellResult> {
  return new Promise((resolve) => {
    const child = spawn(shell.file, shell.build(command), { cwd, windowsVerbatimArguments: shell.verbatim === true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); }, EXEC_TIMEOUT_MS);
    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });
    child.stdin?.end();
    child.on('error', (error) => { clearTimeout(timer); resolve({ code: null, stdout, stderr: error.message }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}
function gitInit(cwd: string): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn('git', ['init'], { cwd, stdio: 'ignore' });
    child.on('error', () => resolve());
    child.on('close', () => resolve());
  });
}
async function createRepo(): Promise<void> {
  repoRoot = await mkdtemp(join(tmpdir(), 'cb-codex-shell-'));
  repoSubDir = join(repoRoot, 'nested', 'sub', 'dir');
  await mkdir(join(repoRoot, '.codex/hooks'), { recursive: true });
  await copyFile(HOOK_ASSET, join(repoRoot, CODEX_HOOK_FILE));
  await mkdir(repoSubDir, { recursive: true });
  await gitInit(repoRoot);
}
async function removeRepo(): Promise<void> {
  if (repoRoot) await rm(repoRoot, { recursive: true, force: true });
  repoRoot = '';
  repoSubDir = '';
}
async function registeredHook(event: string): Promise<CodexHook> {
  const plan = await planCodexInstall(repoRoot);
  const config = JSON.parse(plan.changes.find((item) => item.path === CODEX_CONFIG_FILE)?.content ?? '{}') as CodexConfig;
  return config.hooks?.[event]?.[0]?.hooks?.[0] ?? {};
}

describe('Codex hook command shell execution (CA-20, DEC-04, CR-06)', () => {
  beforeEach(createRepo);
  afterEach(removeRepo);

  for (const [name, shell] of Object.entries(SHELLS)) {
    it(`runs every registered command from a subdirectory under ${name}`, async (ctx) => {
      await requireProcess(ctx, await attemptGitProcess());
      await requireProcess(ctx, await attemptExecutable(shell.file, shell.probe));
      for (const event of EVENTS) {
        const hook = await registeredHook(event);
        expect(hook.commandWindows, event).toBeUndefined();
        const result = await execShell(shell, hook.command ?? '', repoSubDir);
        expect(result.stderr, event).toContain(HOOK_RAN_MARKER);
        expect(result.code, event).toBe(0);
        expect(result.stdout, event).toBe('');
      }
    });
  }
});
