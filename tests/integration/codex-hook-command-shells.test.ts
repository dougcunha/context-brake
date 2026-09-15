import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODEX_HOOK_FILE, planCodexInstall } from '../../src/infrastructure/harnesses/codex-cli/planner.js';

function execShell(cmd: string, args: string[], cwd: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const finalArgs = isWin && args.length === 2 ? [args[0]!, `"${args[1]!}"`] : args;
    const child = spawn(cmd, finalArgs, { cwd, windowsVerbatimArguments: isWin, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.stdin?.end();
    child.on('close', (code) => { resolve({ code, stdout, stderr }); });
  });
}

function initGit(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['init'], { cwd, stdio: 'ignore' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git init exited with ${code}`));
    });
  });
}

describe('Codex hook command shell execution on Windows (CR-07)', () => {
  let root: string;
  let subDir: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-codex-shell-'));
    subDir = join(root, 'nested', 'sub', 'dir');
    await initGit(root);
    await mkdir(join(root, '.codex/hooks'), { recursive: true });
    await copyFile('dist/assets/runtime/codex-cli-hook.mjs', join(root, CODEX_HOOK_FILE));
    await mkdir(subDir, { recursive: true });
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('runs commandWindows under cmd.exe on Windows', async (ctx) => {
    if (process.platform !== 'win32') {
      ctx.skip('Windows-only test for cmd.exe /C commandWindows');
      return;
    }
    const plan = await planCodexInstall(root);
    const config = JSON.parse(plan.changes[0]?.content ?? '{}');
    const hook = config.hooks?.PreToolUse?.[0]?.hooks?.[0];
    expect(hook?.commandWindows).toBeDefined();
    const res = await execShell('cmd.exe', ['/c', hook.commandWindows], subDir);
    expect(res.code).toBe(0);
    expect(res.stdout).toBe('');
  });
});

describe('Codex hook command shell execution on POSIX (CR-07)', () => {
  let root: string;
  let subDir: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-codex-shell-'));
    subDir = join(root, 'nested', 'sub', 'dir');
    await initGit(root);
    await mkdir(join(root, '.codex/hooks'), { recursive: true });
    await copyFile('dist/assets/runtime/codex-cli-hook.mjs', join(root, CODEX_HOOK_FILE));
    await mkdir(subDir, { recursive: true });
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('runs command under sh -lc on POSIX', async (ctx) => {
    if (process.platform === 'win32') {
      ctx.skip('POSIX-only test for sh -lc command');
      return;
    }
    const plan = await planCodexInstall(root);
    const config = JSON.parse(plan.changes[0]?.content ?? '{}');
    const hook = config.hooks?.PreToolUse?.[0]?.hooks?.[0];
    const res = await execShell('/bin/sh', ['-lc', hook.command], subDir);
    expect(res.code).toBe(0);
    expect(res.stdout).toBe('');
  });
});
