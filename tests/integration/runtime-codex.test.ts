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
  root = await mkdtemp(join(tmpdir(), 'cb-codex-runtime-'));
  await writeRuntimeConfig(root);
  hook = await installBuiltHook('codex-cli', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Codex CLI built hook answers documented payloads (TC-33, CA-10)', () => {
  it('stays silent below the ceiling and injects telemetry at yellow', async () => {
    const pre = await runInstalledHook(hook, 'PreToolUse', { session_id: 's', tool_name: 'Bash', tool_input: { command: 'ls' } });
    expect(pre.code).toBe(0);
    expect(pre.stdout).toBe('');
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runInstalledHook(hook, 'PostToolUse', { session_id: 's', tool_use_id: `c${call}` });
    }
    const output = JSON.parse(last.stdout) as { hookSpecificOutput: { additionalContext: string } };
    expect(output.hookSpecificOutput.additionalContext).toContain('turn=4/12');
    expect(output.hookSpecificOutput.additionalContext).toContain('zone=YELLOW');
  });

  it('renders the deny shape above the ceiling', async () => {
    await seedTurns(root, { harness: 'codex-cli', sessionId: 'critical', agentId: null }, 12);
    const denied = await runInstalledHook(hook, 'PreToolUse', { session_id: 'critical', tool_name: 'Bash', tool_input: { command: 'rm -rf x' } });
    const output = JSON.parse(denied.stdout) as { hookSpecificOutput: { hookEventName: string; permissionDecision: string; permissionDecisionReason: string } };
    expect(output.hookSpecificOutput).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'deny' });
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain('reason=critical_ceiling');
  });
});

describe('Codex CLI built hook resets and notifies (DEC-12, DEC-13)', () => {
  it('resets on compaction and names /new on the documented Stop fixture', async () => {
    await seedTurns(root, { harness: 'codex-cli', sessionId: 's', agentId: null }, 9);
    await runInstalledHook(hook, 'SessionStart', { session_id: 's', source: 'compact' });
    const reset = await runInstalledHook(hook, 'PostToolUse', { session_id: 's', tool_use_id: 'c1' });
    expect(reset.stdout).toContain('turn=1/12');
    const stop = await runInstalledHook(hook, 'Stop', await loadHarnessPayload('codex-cli', 'stop.json'));
    expect(JSON.parse(stop.stdout)).toEqual({ systemMessage: 'ContextBrake: the agent requested a session reset. Run /new to start a new session.' });
  });
});
