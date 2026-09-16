import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ASSET_ENTRIES } from '../../scripts/asset-bundler.js';

const RUNTIME_ASSET_DIR = 'dist/assets/runtime';
const NO_OUTPUT = '';
const CURSOR_ALLOW = '{"permission":"allow"}';
const ANTIGRAVITY_ALLOW = '{"decision":"allow"}';
const EMPTY_RESPONSE = '{}';

const INSTALL_PATHS: Readonly<Record<string, string>> = {
  'claude-code-hook.mjs': '.claude/hooks/context-brake.mjs',
  'codex-cli-hook.mjs': '.codex/hooks/context-brake.mjs',
  'cursor-hook.mjs': '.cursor/hooks/context-brake.mjs',
  'github-copilot-cli-hook.mjs': '.github/hooks/context-brake.mjs',
  'antigravity-cli-hook.mjs': '.agents/hooks/context-brake.mjs',
};
type HookCase = { readonly asset: string; readonly event: string; readonly stdout: string };

const HOOK_CASES: readonly HookCase[] = [
  { asset: 'claude-code-hook.mjs', event: 'PreToolUse', stdout: NO_OUTPUT },
  { asset: 'claude-code-hook.mjs', event: 'PostToolUse', stdout: NO_OUTPUT },
  { asset: 'claude-code-hook.mjs', event: 'Stop', stdout: NO_OUTPUT },
  { asset: 'codex-cli-hook.mjs', event: 'PreToolUse', stdout: NO_OUTPUT },
  { asset: 'codex-cli-hook.mjs', event: 'Stop', stdout: NO_OUTPUT },
  { asset: 'cursor-hook.mjs', event: 'preToolUse', stdout: CURSOR_ALLOW },
  { asset: 'cursor-hook.mjs', event: 'postToolUse', stdout: NO_OUTPUT },
  { asset: 'cursor-hook.mjs', event: 'preCompact', stdout: NO_OUTPUT },
  { asset: 'github-copilot-cli-hook.mjs', event: 'preToolUse', stdout: NO_OUTPUT },
  { asset: 'github-copilot-cli-hook.mjs', event: 'postToolUse', stdout: NO_OUTPUT },
  { asset: 'antigravity-cli-hook.mjs', event: 'PreToolUse', stdout: ANTIGRAVITY_ALLOW },
  { asset: 'antigravity-cli-hook.mjs', event: 'PostToolUse', stdout: EMPTY_RESPONSE },
  { asset: 'antigravity-cli-hook.mjs', event: 'PreInvocation', stdout: '{"injectSteps":[]}' },
];
let projectRoot = '';

async function installAsset(asset: string): Promise<void> {
  const target = resolve(projectRoot, INSTALL_PATHS[asset] ?? '');
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(RUNTIME_ASSET_DIR, asset), target);
}
function execHook(asset: string, event: string, stdinData: string): Promise<{ code: number | null; stdout: string }> {
  return new Promise((res) => {
    const hook = resolve(projectRoot, INSTALL_PATHS[asset] ?? '');
    const child = spawn(process.execPath, [hook, event], { cwd: projectRoot, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.on('close', (code) => { res({ code, stdout }); });
    child.stdin.write(stdinData);
    child.stdin.end();
  });
}
describe('runtime asset existence and execution (RF5, RF22)', () => {
  beforeAll(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'cb-package-asset-'));
    for (const asset of Object.keys(INSTALL_PATHS)) await installAsset(asset);
  });
  afterAll(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
  it('verifies all expected runtime asset files exist on disk', async () => {
    for (const entry of ASSET_ENTRIES) {
      const s = await stat(resolve(entry.destination));
      expect(s.isFile()).toBe(true);
      expect(s.size).toBeGreaterThan(0);
    }
  });

  it.each(HOOK_CASES)('$asset answers $event with only the fields its harness documents', async ({ asset, event, stdout }) => {
    const result = await execHook(asset, event, JSON.stringify({ hook_event_name: event }));
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(stdout);
  });

  it('keeps the command event when stdin is malformed, without exiting non-zero', async () => {
    const result = await execHook('cursor-hook.mjs', 'preToolUse', 'not valid json {{{');
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(CURSOR_ALLOW);
  });

  it('writes nothing for an event the harness hook does not handle', async () => {
    const result = await execHook('cursor-hook.mjs', 'afterAgentResponse', 'null');
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(NO_OUTPUT);
  });
});

describe('runtime in-process extension loading (RF5)', () => {
  it('loads in-process plugins and extensions as callable functions', async () => {
    const opencode = await import(resolve('dist/assets/runtime/opencode-plugin.js'));
    const pi = await import(resolve('dist/assets/runtime/pi-extension.js'));
    const omp = await import(resolve('dist/assets/runtime/omp-extension.js'));
    expect(typeof opencode.default).toBe('function');
    expect(typeof pi.default).toBe('function');
    expect(typeof omp.default).toBe('function');
  });
});
