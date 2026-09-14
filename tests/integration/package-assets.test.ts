import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSET_ENTRIES } from '../../scripts/build-assets.js';

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

describe('runtime asset existence and execution (RF5, RF22)', () => {
  it('verifies all expected runtime asset files exist on disk', async () => {
    for (const entry of ASSET_ENTRIES) {
      const s = await stat(resolve(entry.destination));
      expect(s.isFile()).toBe(true);
      expect(s.size).toBeGreaterThan(0);
    }
  });

  it('runs process-hook asset and outputs valid JSON on preToolUse', async () => {
    const hookPath = resolve('dist/assets/runtime/process-hook.mjs');
    const input = JSON.stringify({ hook_event_name: 'PreToolUse' });
    const result = await execHook([hookPath, 'PreToolUse'], input);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout) as { permission?: string };
    expect(parsed.permission).toBe('allow');
  });

  it('catches malformed stdin without throwing or exiting non-zero', async () => {
    const hookPath = resolve('dist/assets/runtime/process-hook.mjs');
    const result = await execHook([hookPath], 'not valid json {{{');
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('{}');
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
