import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

function execShell(cmd: string, args: string[], cwd: string): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const finalArgs = isWin && args.length === 2 ? [args[0]!, `"${args[1]!}"`] : args;
    const child = spawn(cmd, finalArgs, { cwd, windowsVerbatimArguments: isWin, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stdin?.end();
    child.on('close', (code) => { resolve({ code, stdout }); });
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

describe('E2E Codex hook execution (CR-07)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-e2e-codex-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('runs registered hook command from subdirectory in git repo', async () => {
    await initGit(root);
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(join(root, '.codex/hooks.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    const initRes = await runBuiltCli(['init', '--yes'], root);
    expect(initRes.code).toBe(0);

    const subDir = join(root, 'deep', 'sub', 'dir');
    await mkdir(subDir, { recursive: true });
    const config = JSON.parse(await readFile(join(root, '.codex/hooks.json'), 'utf8'));
    const hook = config.hooks?.PreToolUse?.[0]?.hooks?.[0];
    const isWin = process.platform === 'win32';
    const res = isWin
      ? await execShell('cmd.exe', ['/c', hook.commandWindows], subDir)
      : await execShell('/bin/sh', ['-lc', hook.command], subDir);
    expect(res.code).toBe(0);
    expect(res.stdout).toBe('');
  });
});

describe('E2E Codex root warning (CR-07)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-e2e-codex-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('warns when Codex integration is installed outside git repo', async () => {
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(join(root, '.codex/hooks.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    const initRes = await runBuiltCli(['init', '--yes', '--harness', 'codex-cli'], root);
    expect(initRes.code).toBe(0);

    const docRes = await runBuiltCli(['doctor', '--json'], root);
    expect(docRes.code).toBe(1);
    const report = JSON.parse(docRes.stdout);
    const warning = report.findings?.find((f: { code: string }) => f.code === 'CODEX_ROOT_NOT_GIT_TOPLEVEL');
    expect(warning?.severity).toBe('warning');
    expect(warning?.message).toBe('The project root is not a git repository root, so Codex CLI hooks cannot locate the ContextBrake hook script.');
    expect(warning?.impact).toBe('Codex CLI reports a hook failure on every event and runs the tool call without ContextBrake.');
    expect(warning?.remediation).toBe('Run context-brake init from the git repository root, or run git init here.');
  });
});
