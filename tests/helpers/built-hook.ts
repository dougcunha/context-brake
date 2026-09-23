import { spawn } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { HarnessId } from '../../src/core/contracts/harness.js';

export type BuiltHookResult = { readonly code: number | null; readonly stdout: string; readonly stderr: string };
type HookInvocation = { readonly hookPath: string; readonly event: string; readonly payload: unknown; readonly environment: NodeJS.ProcessEnv };

const INSTALLED_HOOK_PATHS: Readonly<Record<HarnessId, string>> = {
  'claude-code': '.claude/hooks/context-brake.mjs',
  'codex-cli': '.codex/hooks/context-brake.mjs',
  cursor: '.cursor/hooks/context-brake.mjs',
  'github-copilot-cli': '.github/hooks/context-brake.mjs',
  'antigravity-cli': '.agents/hooks/context-brake.mjs',
  opencode: '.opencode/plugins/context-brake.js',
  pi: '.pi/extensions/context-brake.js',
  'oh-my-pi': '.omp/extensions/context-brake.js',
};

export function installedHookPath(harness: HarnessId, projectRoot: string): string {
  return resolve(projectRoot, INSTALLED_HOOK_PATHS[harness]);
}

export async function installBuiltHook(harness: HarnessId, projectRoot: string): Promise<string> {
  const target = installedHookPath(harness, projectRoot);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve('dist/assets/runtime', `${harness}-hook.mjs`), target);
  return target;
}

export function runInstalledHook(hookPath: string, event: string, payload: unknown): Promise<BuiltHookResult> {
  return runInstalledHookWithEnvironment({ hookPath, event, payload, environment: process.env });
}

export function runInstalledHookWithEnvironment(input: HookInvocation): Promise<BuiltHookResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [input.hookPath, input.event], {
      cwd: dirname(input.hookPath), stdio: ['pipe', 'pipe', 'pipe'], env: input.environment,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.stdin.end(JSON.stringify(input.payload));
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
  });
}
