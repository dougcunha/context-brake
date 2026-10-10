import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindHookInProcess, runBoundHook, type BoundHook } from '../helpers/in-process-hook.js';
import { seedTurns, writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook: BoundHook;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-copilot-runtime-'));
  await writeRuntimeConfig(root);
  hook = await bindHookInProcess('github-copilot-cli', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('GitHub Copilot CLI built hook with documented payloads (CA-15)', () => {
  it('injects additionalContext after the tool without touching the tool result', async () => {
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runBoundHook(hook, 'postToolUse', { sessionId: 's', toolName: 'bash', toolArgs: { command: 'ls' }, toolResult: { textResultForLlm: 'out', resultType: 'success' } });
    }
    expect(JSON.parse(last.stdout)).toEqual({ additionalContext: expect.stringContaining('turn=4 ') });
  });
});

describe('GitHub Copilot CLI built hook resets (DEC-13)', () => {
  it('resets on preCompact and on a new session source', async () => {
    await seedTurns(root, { harness: 'github-copilot-cli', sessionId: 'cp', agentId: null }, 9);
    await runBoundHook(hook, 'preCompact', { sessionId: 'cp' });
    const reset = await runBoundHook(hook, 'postToolUse', { sessionId: 'cp', toolName: 'bash' });
    expect(reset.stdout).toContain('turn=1 ');
    await runBoundHook(hook, 'sessionStart', { sessionId: 'cp', source: 'new' });
    const started = await runBoundHook(hook, 'postToolUse', { sessionId: 'cp', toolName: 'bash' });
    expect(started.stdout).toContain('turn=1 ');
  });
});
