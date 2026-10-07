import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindHookInProcess, runBoundHook, type BoundHook } from '../helpers/in-process-hook.js';
import { seedCriticalSession, writeInvalidRuntimeConfig } from '../helpers/runtime-seed.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

let root = '';
let hook: BoundHook;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-invalid-config-'));
  await writeInvalidRuntimeConfig(root);
  hook = await bindHookInProcess('claude-code', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('T06 invalid configuration on the built Claude Code hook (TC-04, RF19)', () => {
  it('stays neutral below and at the ceiling without exiting non-zero (prd-12 TC-10)', async () => {
    const below = await runBoundHook(hook, 'PreToolUse', { session_id: 'green', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' } });
    expect(below.code).toBe(0);
    expect(below.stdout).toBe('');
    await seedCriticalSession(root, { harness: 'claude-code', sessionId: 'critical', agentId: null });
    const above = await runBoundHook(hook, 'PreToolUse', { session_id: 'critical', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' } });
    expect(above.code).toBe(0);
    expect(above.stdout).toBe('');
  });

  it('keeps a post-tool event silent and records INVALID_CONFIG in the error log', async () => {
    const post = await runBoundHook(hook, 'PostToolUse', { session_id: 'green', tool_use_id: 't1' });
    expect(post.code).toBe(0);
    expect(post.stdout).toBe('');
    const errors = await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8');
    expect(errors).toContain('"code":"INVALID_CONFIG"');
  });
});
