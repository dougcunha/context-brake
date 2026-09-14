import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSET_ENTRIES } from '../../scripts/asset-bundler.js';

type HookCase = { readonly asset: string; readonly event: string; readonly stdout: string };

const RUNTIME_ASSET_DIR = 'dist/assets/runtime';
const NO_OUTPUT = '';
const EMPTY_RESPONSE = '{}';
const CURSOR_ALLOW = '{"permission":"allow"}';

const HOOK_CASES: readonly HookCase[] = [
  { asset: 'claude-code-hook.mjs', event: 'PreToolUse', stdout: NO_OUTPUT },
  { asset: 'claude-code-hook.mjs', event: 'PostToolUse', stdout: NO_OUTPUT },
  { asset: 'claude-code-hook.mjs', event: 'SessionStart', stdout: NO_OUTPUT },
  { asset: 'codex-cli-hook.mjs', event: 'PreToolUse', stdout: NO_OUTPUT },
  { asset: 'codex-cli-hook.mjs', event: 'PostToolUse', stdout: NO_OUTPUT },
  { asset: 'codex-cli-hook.mjs', event: 'SessionStart', stdout: NO_OUTPUT },
  { asset: 'github-copilot-cli-hook.mjs', event: 'preToolUse', stdout: NO_OUTPUT },
  { asset: 'github-copilot-cli-hook.mjs', event: 'postToolUse', stdout: NO_OUTPUT },
  { asset: 'github-copilot-cli-hook.mjs', event: 'sessionStart', stdout: NO_OUTPUT },
  { asset: 'cursor-hook.mjs', event: 'preToolUse', stdout: CURSOR_ALLOW },
  { asset: 'cursor-hook.mjs', event: 'postToolUse', stdout: EMPTY_RESPONSE },
  { asset: 'cursor-hook.mjs', event: 'sessionStart', stdout: EMPTY_RESPONSE },
  { asset: 'antigravity-cli-hook.mjs', event: 'PreToolUse', stdout: '{"decision":"allow"}' },
  { asset: 'antigravity-cli-hook.mjs', event: 'PreInvocation', stdout: '{"injectSteps":[]}' },
];

function execHook(args: string[], stdinData: string): Promise<{ code: number | null; stdout: string }> {
  return new Promise((res) => {
    const child = spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.on('close', (code) => { res({ code, stdout }); });
    child.stdin.write(stdinData);
    child.stdin.end();
  });
}

function hookPath(asset: string): string {
  return resolve(RUNTIME_ASSET_DIR, asset);
}

describe('runtime asset existence and execution (RF5, RF22)', () => {
  it('verifies all expected runtime asset files exist on disk', async () => {
    for (const entry of ASSET_ENTRIES) {
      const s = await stat(resolve(entry.destination));
      expect(s.isFile()).toBe(true);
      expect(s.size).toBeGreaterThan(0);
    }
  });

  it.each(HOOK_CASES)('$asset answers $event with only the fields its harness documents', async ({ asset, event, stdout }) => {
    const result = await execHook([hookPath(asset), event], JSON.stringify({ hook_event_name: event }));
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(stdout);
  });

  it('resolves the event from the payload when the command omits it', async () => {
    const result = await execHook([hookPath('cursor-hook.mjs')], JSON.stringify({ hook_event_name: 'preToolUse' }));
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(CURSOR_ALLOW);
  });

  it('keeps the command event when stdin is malformed, without exiting non-zero', async () => {
    const result = await execHook([hookPath('cursor-hook.mjs'), 'preToolUse'], 'not valid json {{{');
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(CURSOR_ALLOW);
  });

  it('writes nothing for an event the harness hook does not handle', async () => {
    const result = await execHook([hookPath('cursor-hook.mjs')], 'null');
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
