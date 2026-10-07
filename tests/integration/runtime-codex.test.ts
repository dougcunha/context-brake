import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindHookInProcess, runBoundHook, type BoundHook } from '../helpers/in-process-hook.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { seedCriticalSession, seedTurns, writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook: BoundHook;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-codex-runtime-'));
  await writeRuntimeConfig(root);
  hook = await bindHookInProcess('codex-cli', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Codex CLI built hook answers documented payloads (TC-33, CA-10)', () => {
  it('stays silent below the ceiling and injects telemetry at yellow', async () => {
    const pre = await runBoundHook(hook, 'PreToolUse', { session_id: 's', tool_name: 'Bash', tool_input: { command: 'ls' } });
    expect(pre.code).toBe(0);
    expect(pre.stdout).toBe('');
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runBoundHook(hook, 'PostToolUse', { session_id: 's', tool_use_id: `c${call}` });
    }
    const output = JSON.parse(last.stdout) as { hookSpecificOutput: { additionalContext: string } };
    expect(output.hookSpecificOutput.additionalContext).toContain('turn=4 ');
    expect(output.hookSpecificOutput.additionalContext).toContain('zone=YELLOW');
  });

  it('stays silent on PreToolUse above the ceiling (prd-12 FR-07)', async () => {
    await seedCriticalSession(root, { harness: 'codex-cli', sessionId: 'critical', agentId: null });
    const critical = await runBoundHook(hook, 'PreToolUse', { session_id: 'critical', tool_name: 'Bash', tool_input: { command: 'rm -rf x' } });
    expect(critical.stdout).toBe('');
  });
});

describe('Codex CLI built hook resets and notifies (DEC-12, DEC-13)', () => {
  it('resets on compaction and names /new on the documented Stop fixture', async () => {
    await seedTurns(root, { harness: 'codex-cli', sessionId: 's', agentId: null }, 9);
    await runBoundHook(hook, 'SessionStart', { session_id: 's', source: 'compact' });
    const reset = await runBoundHook(hook, 'PostToolUse', { session_id: 's', tool_use_id: 'c1' });
    expect(reset.stdout).toContain('turn=1 ');
    const stop = await runBoundHook(hook, 'Stop', await loadHarnessPayload('codex-cli', 'stop.json'));
    expect(JSON.parse(stop.stdout)).toEqual({ systemMessage: 'ContextBrake: the agent requested a session reset. Run /new to start a new session.' });
  });
});
