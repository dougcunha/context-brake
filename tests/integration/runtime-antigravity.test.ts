import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindHookInProcess, runBoundHook, type BoundHook } from '../helpers/in-process-hook.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook: BoundHook;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-agy-runtime-'));
  await writeRuntimeConfig(root);
  hook = await bindHookInProcess('antigravity-cli', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Antigravity CLI counts turns and injects through PreInvocation (DEC-13, DEC-14)', () => {
  it('counts one turn per PostToolUse call and replies with an empty object', async () => {
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runBoundHook(hook, 'PostToolUse', { conversationId: 'agy', toolCall: { name: 'run_command', args: { CommandLine: 'ls' } }, stepIdx: call });
    }
    expect(last.stdout).toBe('{}');
    const invocation = await runBoundHook(hook, 'PreInvocation', { conversationId: 'agy', invocationNum: 2 });
    expect(JSON.parse(invocation.stdout)).toEqual({ injectSteps: [{ ephemeralMessage: expect.stringContaining('turn=4 ') }] });
  });
});
