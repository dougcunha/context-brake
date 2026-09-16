import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODEX_CONFIG_FILE, CODEX_HOOK_FILE, planCodexInstall } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { attemptGitProcess, attemptShellProcess, requireProcess } from '../helpers/process-capability.js';

const IS_WINDOWS = process.platform === 'win32';
const HOOK_ASSET = 'dist/assets/runtime/codex-cli-hook.mjs';
const EXEC_TIMEOUT_MS = 15000;
const EVENTS = ['PreToolUse', 'Stop'] as const;
type ShellResult = { readonly code: number | null; readonly stdout: string; readonly stderr: string };
type SkipContext = { skip: (note?: string) => never };
type CodexHook = { command?: string; commandWindows?: string };
type CodexConfig = { hooks?: Record<string, { hooks?: CodexHook[] }[]> };
let repoRoot = '';
let repoSubDir = '';

function execShell(cmd: string, args: string[], cwd: string): Promise<ShellResult> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const finalArgs = isWin && args.length === 2 ? [args[0]!, `"${args[1]!}"`] : args;
    const child = spawn(cmd, finalArgs, { cwd, windowsVerbatimArguments: isWin, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); }, EXEC_TIMEOUT_MS);
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.stdin?.end();
    child.on('error', (error) => { clearTimeout(timer); resolve({ code: null, stdout, stderr: error.message }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}
function tryGitInit(cwd: string): Promise<void> {
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
  await tryGitInit(repoRoot);
}
async function removeRepo(): Promise<void> {
  if (repoRoot) await rm(repoRoot, { recursive: true, force: true });
  repoRoot = '';
  repoSubDir = '';
}
async function registeredCommands(event: string): Promise<{ posix: string; windows: string }> {
  const plan = await planCodexInstall(repoRoot);
  const change = plan.changes.find((item) => item.path === CODEX_CONFIG_FILE);
  const config = JSON.parse(change?.content ?? '{}') as CodexConfig;
  const hook = config.hooks?.[event]?.[0]?.hooks?.[0];
  return { posix: hook?.command ?? '', windows: hook?.commandWindows ?? '' };
}
async function runRegisteredShell(ctx: SkipContext, shell: string): Promise<void> {
  await requireProcess(ctx, await attemptGitProcess());
  await requireProcess(ctx, await attemptShellProcess(shell));
  for (const event of EVENTS) {
    const commands = await registeredCommands(event);
    const result = await execShell(shell, ['-lc', commands.posix], repoSubDir);
    expect(result.code, event).toBe(0);
    expect(result.stdout, event).toBe('');
  }
}
describe('Codex hook command shell execution (CA-20, DEC-04, CR-06)', () => {
  beforeEach(createRepo);
  afterEach(removeRepo);

  if (IS_WINDOWS) {
    it('runs the registered commandWindows under cmd.exe /C', async (ctx) => {
      await requireProcess(ctx, await attemptGitProcess());
      for (const event of EVENTS) {
        const commands = await registeredCommands(event);
        const result = await execShell('cmd.exe', ['/c', commands.windows], repoSubDir);
        expect(result.code, event).toBe(0);
        expect(result.stdout, event).toBe('');
      }
    });
  } else {
    it('runs the registered command under sh -lc', async (ctx) => {
      await runRegisteredShell(ctx, 'sh');
    });
    it('runs the registered command under bash -lc', async (ctx) => {
      await runRegisteredShell(ctx, 'bash');
    });
  }
});
