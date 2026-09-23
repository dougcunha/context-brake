import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installBuiltHook, runInstalledHook } from '../helpers/built-hook.js';
import { loadOmpHandlers, loadPiHandlers, seedMalformedCheckpoint, seedMalformedPlan } from '../helpers/boot-fixture.js';

let root = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-boot-invalid-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

function assertRepairInstruction(text: string, file: string, secret: string): void {
  expect(text).toContain(`[ContextBrake boot v1] Repair ${file}:`);
  expect(text).toContain('Validate the file before continuing.');
  expect(text).not.toContain(secret);
}

describe('boot with malformed checkpoint delivers instruction to process hooks (RF7, RF11, CA-04, TC-04)', () => {
  it('delivers checkpoint repair instruction for process hooks without state content', async () => {
    await seedMalformedCheckpoint(root);
    const claudeHook = await installBuiltHook('claude-code', root);
    const claude = await runInstalledHook(claudeHook, 'SessionStart', { session_id: 's1', hook_event_name: 'SessionStart', source: 'startup' });
    const claudeData = JSON.parse(claude.stdout) as { hookSpecificOutput: { additionalContext: string } };
    assertRepairInstruction(claudeData.hookSpecificOutput.additionalContext, 'state_checkpoint.json', 'SECRET CHECKPOINT');
    const codexHook = await installBuiltHook('codex-cli', root);
    const codex = await runInstalledHook(codexHook, 'SessionStart', { session_id: 's1', hook_event_name: 'SessionStart', source: 'startup' });
    const codexData = JSON.parse(codex.stdout) as { hookSpecificOutput: { additionalContext: string } };
    assertRepairInstruction(codexData.hookSpecificOutput.additionalContext, 'state_checkpoint.json', 'SECRET CHECKPOINT');
    const cursorHook = await installBuiltHook('cursor', root);
    const cursor = await runInstalledHook(cursorHook, 'sessionStart', { conversation_id: 'c1', hook_event_name: 'sessionStart' });
    assertRepairInstruction((JSON.parse(cursor.stdout) as { additional_context: string }).additional_context, 'state_checkpoint.json', 'SECRET CHECKPOINT');
    const copilotHook = await installBuiltHook('github-copilot-cli', root);
    const copilot = await runInstalledHook(copilotHook, 'sessionStart', { sessionId: 'cp1', source: 'startup' });
    assertRepairInstruction((JSON.parse(copilot.stdout) as { additionalContext: string }).additionalContext, 'state_checkpoint.json', 'SECRET CHECKPOINT');
  });
});

describe('boot with malformed checkpoint delivers instruction to in-process extensions (RF7, RF11, CA-04, TC-04)', () => {
  it('delivers checkpoint repair instruction for in-process extensions', async () => {
    await seedMalformedCheckpoint(root);
    const pi = await loadPiHandlers();
    const piCtx = { cwd: root, sessionManager: { getSessionId: () => 'pi-inv' } };
    await pi.get('session_start')!({ reason: 'new' }, piCtx);
    const piBoot = (await pi.get('before_agent_start')!({}, piCtx)) as { message: string };
    assertRepairInstruction(piBoot.message, 'state_checkpoint.json', 'SECRET CHECKPOINT');
    const omp = await loadOmpHandlers();
    const ompCtx = { cwd: root, sessionManager: { getSessionId: () => 'omp-inv' } };
    await omp.get('session_start')!({ reason: 'new' }, ompCtx);
    const ompBoot = (await omp.get('before_agent_start')!({}, ompCtx)) as { message: string };
    assertRepairInstruction(ompBoot.message, 'state_checkpoint.json', 'SECRET CHECKPOINT');
  });
});

describe('boot with malformed plan delivers instruction only (RF7, RF11, CA-04, TC-04)', () => {
  it('delivers plan repair instruction when plan is malformed', async () => {
    await seedMalformedPlan(root);
    const claudeHook = await installBuiltHook('claude-code', root);
    const claude = await runInstalledHook(claudeHook, 'SessionStart', { session_id: 's2', hook_event_name: 'SessionStart', source: 'startup' });
    const claudeData = JSON.parse(claude.stdout) as { hookSpecificOutput: { additionalContext: string } };
    assertRepairInstruction(claudeData.hookSpecificOutput.additionalContext, 'task_plan.json', 'SECRET PLAN');
  });
});
