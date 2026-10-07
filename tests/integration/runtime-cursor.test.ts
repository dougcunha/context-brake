import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installBuiltHook, runInstalledHook } from '../helpers/built-hook.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { seedCriticalSession, seedTurns, writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-cursor-runtime-'));
  await writeRuntimeConfig(root);
  hook = await installBuiltHook('cursor', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Cursor built hook with documented payloads (CA-15, TC-18)', () => {
  it('writes nothing for an unregistered preToolUse event, even above the ceiling (prd-12 FR-07, TC-09)', async () => {
    await seedCriticalSession(root, { harness: 'cursor', sessionId: 'critical', agentId: null });
    const critical = await runInstalledHook(hook, 'preToolUse', { conversation_id: 'critical', tool_name: 'Shell', tool_input: { command: 'rm -rf x' } });
    expect([critical.code, critical.stdout]).toEqual([0, '']);
  });
});

describe('Cursor built hook injects telemetry and resets (DEC-13)', () => {
  it('injects additional_context after a tool and resets at preCompact', async () => {
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runInstalledHook(hook, 'postToolUse', { conversation_id: 'c2', tool_use_id: `x${call}` });
    }
    expect((JSON.parse(last.stdout) as { additional_context: string }).additional_context).toContain('turn=4 ');
    await seedTurns(root, { harness: 'cursor', sessionId: 'cursor-conv-1', agentId: null }, 9);
    await runInstalledHook(hook, 'preCompact', await loadHarnessPayload('cursor', 'pre-compact.json'));
    const after = await runInstalledHook(hook, 'postToolUse', { conversation_id: 'cursor-conv-1', tool_use_id: 'next' });
    expect(after.stdout).toContain('turn=1 ');
  });
});
