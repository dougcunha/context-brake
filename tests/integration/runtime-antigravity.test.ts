import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindHookInProcess, runBoundHook, type BoundHook } from '../helpers/in-process-hook.js';
import { seedCriticalSession, writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook: BoundHook;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-agy-runtime-'));
  await writeRuntimeConfig(root);
  hook = await bindHookInProcess('antigravity-cli', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Antigravity CLI built hook follows the documented response shape (DEC-14)', () => {
  it('writes nothing for an unregistered PreToolUse event, even above the ceiling (prd-12 FR-07, TC-09)', async () => {
    await seedCriticalSession(root, { harness: 'antigravity-cli', sessionId: 'critical', agentId: null });
    const critical = await runBoundHook(hook, 'PreToolUse', { conversationId: 'critical', toolCall: { name: 'run_command', args: { CommandLine: 'rm -rf x' } } });
    expect([critical.code, critical.stdout]).toEqual([0, '']);
  });
});

describe('Antigravity CLI counts turns and injects through PreInvocation (DEC-13)', () => {
  it('counts one turn per PostToolUse call and replies with an empty object', async () => {
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runBoundHook(hook, 'PostToolUse', { conversationId: 'agy', toolCall: { name: 'run_command', args: { CommandLine: 'ls' } }, stepIdx: call });
    }
    expect(last.stdout).toBe('{}');
    const invocation = await runBoundHook(hook, 'PreInvocation', { conversationId: 'agy', invocationNum: 2 });
    const injected = JSON.parse(invocation.stdout) as { injectSteps: { ephemeralMessage: string }[] };
    expect(injected.injectSteps[0]?.ephemeralMessage).toContain('turn=4 ');
  });

  it('answers PreInvocation with an empty injectSteps list while green', async () => {
    await writeRuntimeConfig(root, 128000);
    const result = await runBoundHook(hook, 'PreInvocation', { conversationId: 'fresh', invocationNum: 1 });
    expect(JSON.parse(result.stdout)).toEqual({ injectSteps: [] });
  });
});
