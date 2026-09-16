import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installBuiltHook, runInstalledHook } from '../helpers/built-hook.js';
import { seedTurns, writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-agy-runtime-'));
  await writeRuntimeConfig(root);
  hook = await installBuiltHook('antigravity-cli', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Antigravity CLI built hook follows the documented response shape (DEC-14)', () => {
  it('answers PreToolUse with the required decision and denies above the ceiling', async () => {
    const allowed = await runInstalledHook(hook, 'PreToolUse', { conversationId: 'c1', toolCall: { name: 'run_command', args: { CommandLine: 'ls' } } });
    expect(JSON.parse(allowed.stdout)).toEqual({ decision: 'allow' });
    await seedTurns(root, { harness: 'antigravity-cli', sessionId: 'critical', agentId: null }, 12);
    const denied = await runInstalledHook(hook, 'PreToolUse', { conversationId: 'critical', toolCall: { name: 'run_command', args: { CommandLine: 'rm -rf x' } } });
    const shape = JSON.parse(denied.stdout) as { decision: string; reason: string };
    expect(shape.decision).toBe('deny');
    expect(shape.reason).toContain('reason=critical_ceiling');
  });
});

describe('Antigravity CLI counts turns and injects through PreInvocation (DEC-13)', () => {
  it('counts one turn per PostToolUse call and replies with an empty object', async () => {
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runInstalledHook(hook, 'PostToolUse', { conversationId: 'agy', toolCall: { name: 'run_command', args: { CommandLine: 'ls' } }, stepIdx: call });
    }
    expect(last.stdout).toBe('{}');
    const invocation = await runInstalledHook(hook, 'PreInvocation', { conversationId: 'agy', invocationNum: 2 });
    const injected = JSON.parse(invocation.stdout) as { injectSteps: { ephemeralMessage: string }[] };
    expect(injected.injectSteps[0]?.ephemeralMessage).toContain('turn=4/12');
  });

  it('answers PreInvocation with an empty injectSteps list while green', async () => {
    await writeRuntimeConfig(root, 128000);
    const result = await runInstalledHook(hook, 'PreInvocation', { conversationId: 'fresh', invocationNum: 1 });
    expect(JSON.parse(result.stdout)).toEqual({ injectSteps: [] });
  });
});
