import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindHookInProcess, runBoundHook, type BoundHook } from '../helpers/in-process-hook.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { seedTurns, writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook: BoundHook;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-cursor-runtime-'));
  await writeRuntimeConfig(root);
  hook = await bindHookInProcess('cursor', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Cursor built hook injects telemetry and resets (CA-15, TC-18, DEC-13)', () => {
  it('injects additional_context after a tool and resets at preCompact', async () => {
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runBoundHook(hook, 'postToolUse', { conversation_id: 'c2', tool_use_id: `x${call}` });
    }
    expect(JSON.parse(last.stdout)).toEqual({ additional_context: expect.stringContaining('turn=4 ') });
    await seedTurns(root, { harness: 'cursor', sessionId: 'cursor-conv-1', agentId: null }, 9);
    await runBoundHook(hook, 'preCompact', await loadHarnessPayload('cursor', 'pre-compact.json'));
    const after = await runBoundHook(hook, 'postToolUse', { conversation_id: 'cursor-conv-1', tool_use_id: 'next' });
    expect(after.stdout).toContain('turn=1 ');
  });
});
