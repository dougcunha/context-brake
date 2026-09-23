import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installBuiltHook, runInstalledHook } from '../helpers/built-hook.js';
import { loadOmpHandlers, loadPiHandlers, seedCompletedBoot, seedValidBoot } from '../helpers/boot-fixture.js';

let root = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-boot-deliv-'));
  await seedValidBoot(root);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

function assertBootContent(text: string): void {
  expect(text).toContain('Task: Alpha Task (task-alpha)');
  expect(text).toContain('Current step: 3: Implement core (IN_PROGRESS)');
  expect(text).toContain('Next step: 4: Add tests (PENDING)');
  expect(text).toContain('Must not exceed token budget');
  expect(text).toContain('No UI or server components');
  expect(text).toContain('Before any edit, run `npm run check` to validate step 3.');
}

describe('process hook boot delivery on session start (RF9, CA-05, TC-05)', () => {
  it('delivers boot for Claude Code and Codex CLI in hookSpecificOutput', async () => {
    const claudeHook = await installBuiltHook('claude-code', root);
    const claude = await runInstalledHook(claudeHook, 'SessionStart', { session_id: 's1', hook_event_name: 'SessionStart', source: 'startup' });
    const claudeData = JSON.parse(claude.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } };
    expect(claudeData.hookSpecificOutput.hookEventName).toBe('SessionStart');
    assertBootContent(claudeData.hookSpecificOutput.additionalContext);
    const codexHook = await installBuiltHook('codex-cli', root);
    const codex = await runInstalledHook(codexHook, 'SessionStart', { session_id: 's1', hook_event_name: 'SessionStart', source: 'startup' });
    const codexData = JSON.parse(codex.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } };
    expect(codexData.hookSpecificOutput.hookEventName).toBe('SessionStart');
    assertBootContent(codexData.hookSpecificOutput.additionalContext);
  });

  it('delivers boot for Cursor across session identifiers and Copilot CLI', async () => {
    const cursorHook = await installBuiltHook('cursor', root);
    const resConv = await runInstalledHook(cursorHook, 'sessionStart', { conversation_id: 'c1', hook_event_name: 'sessionStart' });
    const resSess = await runInstalledHook(cursorHook, 'sessionStart', { session_id: 'c2', hook_event_name: 'sessionStart' });
    assertBootContent((JSON.parse(resConv.stdout) as { additional_context: string }).additional_context);
    assertBootContent((JSON.parse(resSess.stdout) as { additional_context: string }).additional_context);
    const copilotHook = await installBuiltHook('github-copilot-cli', root);
    const copilot = await runInstalledHook(copilotHook, 'sessionStart', { sessionId: 'cp1', source: 'startup' });
    assertBootContent((JSON.parse(copilot.stdout) as { additionalContext: string }).additionalContext);
  });
});

describe('compaction delivery and exclusions (DEC-05, DEC-15, TC-05, TC-06)', () => {
  it('delivers boot on compaction for Claude and Codex, but not Cursor or Copilot', async () => {
    const claudeHook = await installBuiltHook('claude-code', root);
    const claude = await runInstalledHook(claudeHook, 'SessionStart', { session_id: 's2', hook_event_name: 'SessionStart', source: 'compact' });
    expect(JSON.parse(claude.stdout).hookSpecificOutput.additionalContext).toContain('Alpha Task');
    const cursorHook = await installBuiltHook('cursor', root);
    expect((await runInstalledHook(cursorHook, 'preCompact', { conversation_id: 'c3' })).stdout).toBe('');
    const copilotHook = await installBuiltHook('github-copilot-cli', root);
    expect((await runInstalledHook(copilotHook, 'preCompact', { sessionId: 'cp2' })).stdout).toBe('');
  });

  it('delivers no boot for Antigravity or when all steps are completed', async () => {
    const agHook = await installBuiltHook('antigravity-cli', root);
    expect((await runInstalledHook(agHook, 'sessionStart', { conversationId: 'ag1' })).stdout).toBe('');
    await seedCompletedBoot(root);
    const claudeHook = await installBuiltHook('claude-code', root);
    expect((await runInstalledHook(claudeHook, 'SessionStart', { session_id: 's3', hook_event_name: 'SessionStart', source: 'startup' })).stdout).toBe('');
  });
});

describe('in-process extensions deliver boot via before_agent_start (DEC-04, TC-05)', () => {
  it('delivers once per session and reinjects on compaction for Pi and Oh-My-Pi', async () => {
    const pi = await loadPiHandlers();
    const piCtx = { cwd: root, sessionManager: { getSessionId: () => 'pi-s1' } };
    await pi.get('session_start')!({ reason: 'new' }, piCtx);
    assertBootContent(((await pi.get('before_agent_start')!({}, piCtx)) as { message: string }).message);
    expect(await pi.get('before_agent_start')!({}, piCtx)).toBeUndefined();
    await pi.get('session_compact')!({ reason: 'compact' }, piCtx);
    assertBootContent(((await pi.get('before_agent_start')!({}, piCtx)) as { message: string }).message);
    const omp = await loadOmpHandlers();
    const ompCtx = { cwd: root, sessionManager: { getSessionId: () => 'omp-s1' } };
    await omp.get('session_start')!({ reason: 'new' }, ompCtx);
    assertBootContent(((await omp.get('before_agent_start')!({}, ompCtx)) as { message: string }).message);
    await omp.get('auto_compaction_end')!({}, ompCtx);
    assertBootContent(((await omp.get('before_agent_start')!({}, ompCtx)) as { message: string }).message);
  });
});
