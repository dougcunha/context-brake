import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installBuiltHook, runInstalledHook } from '../helpers/built-hook.js';
import { seedTurns, writeRuntimeConfig } from '../helpers/runtime-seed.js';

let root = '';
let hook = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-copilot-runtime-'));
  await writeRuntimeConfig(root);
  hook = await installBuiltHook('github-copilot-cli', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('GitHub Copilot CLI built hook with documented payloads (CA-15)', () => {
  it('stays silent below the ceiling and denies above it', async () => {
    const neutral = await runInstalledHook(hook, 'preToolUse', { sessionId: 's', toolName: 'bash', toolArgs: { command: 'ls' } });
    expect(neutral.stdout).toBe('');
    await seedTurns(root, { harness: 'github-copilot-cli', sessionId: 'critical', agentId: null }, 12);
    const denied = await runInstalledHook(hook, 'preToolUse', { sessionId: 'critical', toolName: 'bash', toolArgs: { command: 'rm -rf x' } });
    const shape = JSON.parse(denied.stdout) as { permissionDecision: string; permissionDecisionReason: string };
    expect(shape.permissionDecision).toBe('deny');
    expect(shape.permissionDecisionReason).toContain('reason=critical_ceiling');
  });

  it('injects additionalContext after the tool without touching the tool result', async () => {
    let last = { stdout: '' };
    for (let call = 1; call <= 4; call += 1) {
      last = await runInstalledHook(hook, 'postToolUse', { sessionId: 's', toolName: 'bash', toolArgs: { command: 'ls' }, toolResult: { textResultForLlm: 'out', resultType: 'success' } });
    }
    const shape = JSON.parse(last.stdout) as Record<string, unknown>;
    expect(shape).toHaveProperty('additionalContext');
    expect((shape.additionalContext as string)).toContain('turn=4/12');
    expect(shape).not.toHaveProperty('modifiedResult');
  });
});

describe('GitHub Copilot CLI built hook resets (DEC-13)', () => {
  it('resets on preCompact and on a new session source', async () => {
    await seedTurns(root, { harness: 'github-copilot-cli', sessionId: 'cp', agentId: null }, 9);
    await runInstalledHook(hook, 'preCompact', { sessionId: 'cp' });
    const reset = await runInstalledHook(hook, 'postToolUse', { sessionId: 'cp', toolName: 'bash' });
    expect(reset.stdout).toContain('turn=1/12');
    await runInstalledHook(hook, 'sessionStart', { sessionId: 'cp', source: 'new' });
    const started = await runInstalledHook(hook, 'postToolUse', { sessionId: 'cp', toolName: 'bash' });
    expect(started.stdout).toContain('turn=1/12');
  });
});
