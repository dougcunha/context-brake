import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installBuiltHook, runInstalledHook } from '../helpers/built-hook.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { seedTurns, writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-cursor-runtime-'));
  await writeRuntimeConfig(root);
  hook = await installBuiltHook('cursor', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Cursor built hook with documented payloads (CA-15, TC-18)', () => {
  it('answers a neutral pre-tool call with the required explicit allow', async () => {
    const result = await runInstalledHook(hook, 'preToolUse', { conversation_id: 'c1', tool_name: 'Shell', tool_input: { command: 'ls' } });
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ permission: 'allow' });
  });

  it('denies a non-allowlisted shell call above the ceiling and allows git status', async () => {
    await seedTurns(root, { harness: 'cursor', sessionId: 'critical', agentId: null }, 12);
    const denied = await runInstalledHook(hook, 'preToolUse', { conversation_id: 'critical', tool_name: 'Shell', tool_input: { command: 'rm -rf x' } });
    const shape = JSON.parse(denied.stdout) as { permission: string; agent_message: string; user_message: string };
    expect(shape.permission).toBe('deny');
    expect(shape.agent_message).toContain('reason=critical_ceiling');
    expect(shape.user_message).toBe('ContextBrake blocked Shell: the session is above the critical ceiling.');
    const allowed = await runInstalledHook(hook, 'preToolUse', { conversation_id: 'critical', tool_name: 'Shell', tool_input: { command: 'git status' } });
    expect(JSON.parse(allowed.stdout)).toEqual({ permission: 'allow' });
  });
});

describe('Cursor built hook injects telemetry and resets (DEC-13)', () => {
  it('injects additional_context after a tool and resets at preCompact', async () => {
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runInstalledHook(hook, 'postToolUse', { conversation_id: 'c2', tool_use_id: `x${call}` });
    }
    expect((JSON.parse(last.stdout) as { additional_context: string }).additional_context).toContain('turn=4/12');
    await seedTurns(root, { harness: 'cursor', sessionId: 'cursor-conv-1', agentId: null }, 9);
    await runInstalledHook(hook, 'preCompact', await loadHarnessPayload('cursor', 'pre-compact.json'));
    const after = await runInstalledHook(hook, 'postToolUse', { conversation_id: 'cursor-conv-1', tool_use_id: 'next' });
    expect(after.stdout).toContain('turn=1/12');
  });
});
