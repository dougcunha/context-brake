import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import type { HarnessId } from '../../src/core/contracts/harness.js';

export const INSTALLED_STATUSLINE_BRIDGE_PATH = '.claude/hooks/context-brake-statusline.mjs';
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

export type PipelineResult = { readonly code: number | null; readonly stdout: Buffer; readonly bridgeCode: number | null };
export type PipelineInvocation = { readonly bridgeArgs: readonly string[]; readonly previousArgs: readonly string[] | null; readonly stdin: string | Buffer };
type ProcessOutput = { readonly code: number | null; readonly stdout: Buffer };
type PipedChild = ChildProcessByStdio<Writable, Readable, null>;

export async function installBuiltStatuslineBridge(projectRoot: string): Promise<string> {
  const target = resolve(projectRoot, INSTALLED_STATUSLINE_BRIDGE_PATH);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve('dist/assets/runtime/claude-code-statusline.mjs'), target);
  return target;
}

export async function runStatuslinePipeline(bridgePath: string, invocation: PipelineInvocation): Promise<PipelineResult> {
  const bridge = spawnNode([bridgePath, ...invocation.bridgeArgs]);
  const previous = invocation.previousArgs === null ? null : spawnNode(invocation.previousArgs);
  if (previous !== null) bridge.stdout.pipe(previous.stdin);
  bridge.stdin.end(invocation.stdin);
  const [bridgeOutput, output] = await Promise.all([collectOutput(bridge), previous === null ? null : collectOutput(previous)]);
  return { ...(output ?? bridgeOutput), bridgeCode: bridgeOutput.code };
}

export function runPreviousCommand(previousArgs: readonly string[], stdin: string | Buffer): Promise<ProcessOutput> {
  const child = spawnNode(previousArgs);
  child.stdin.end(stdin);
  return collectOutput(child);
}

function spawnNode(args: readonly string[]): PipedChild {
  const child = spawn(process.execPath, [...args], { stdio: ['pipe', 'pipe', 'ignore'] });
  child.stdin.on('error', () => undefined);
  return child;
}

function collectOutput(child: PipedChild): Promise<ProcessOutput> {
  const chunks: Buffer[] = [];
  child.stdout.on('data', (data: Buffer) => { chunks.push(data); });
  return new Promise((resolvePromise) => { child.on('close', (code) => resolvePromise({ code, stdout: Buffer.concat(chunks) })); });
}
