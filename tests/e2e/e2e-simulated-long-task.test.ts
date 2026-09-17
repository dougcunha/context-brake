import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { attemptGit, requireGit, runGit } from '../helpers/git-capability.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { PROFILE_CATALOG, sessionSteps, stateToolHarness, type AgentProfile, type CallExpectation } from '../support/harness-simulator/agent-profiles.js';
import { IN_PROCESS_HARNESSES, createInProcessSession, type InProcessHarnessId } from '../support/harness-simulator/in-process-driver.js';
import { createProcessSession, installHarness, type ProcessHarnessId } from '../support/harness-simulator/process-driver.js';
import { SessionRecorder, initializeRepository, lastCommitSubject, readLedgerLines, runScript, type CallOutcome, type SessionChannel } from '../support/harness-simulator/session-recorder.js';
import { CHECKPOINT_FILE, PLAN_FILE, SIMULATED_WINDOWS, planContent, seedCharactersFor, seedRedSession, type SimulatedWindow } from '../support/harness-simulator/scenarios.js';

const SESSION_COUNT = 20;
const SESSION_TIMEOUT_MS = 600000;
const LONG_TASK_HARNESSES: readonly (ProcessHarnessId | InProcessHarnessId)[] = ['claude-code', 'cursor', 'github-copilot-cli', ...IN_PROCESS_HARNESSES];
const EMPTY_CHECKPOINT = '{"schemaVersion": 1, "currentStepId": 1, "steps": []}\n';

function isInProcess(harness: ProcessHarnessId | InProcessHarnessId): harness is InProcessHarnessId {
  return harness === 'pi' || harness === 'oh-my-pi';
}
function profileFor(harness: HarnessId, index: number): AgentProfile {
  const profile = PROFILE_CATALOG[index] ?? 'compliant';
  return profile === 'subagent' && harness !== 'claude-code' ? 'compaction' : profile;
}
function expectedOutcome(expectation: CallExpectation, harness: HarnessId): CallOutcome {
  if (expectation === 'execute') return 'executed';
  if (expectation === 'harness_gated') return stateToolHarness(harness) ? 'executed' : 'denied';
  return 'denied';
}
async function createRoot(window: SimulatedWindow): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-t09-long-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/app.ts'), 'export const app = true;\n', 'utf8');
  await writeRuntimeConfig(root, window);
  await initializeRepository(root);
  await writeFile(join(root, PLAN_FILE), planContent(), 'utf8');
  await writeFile(join(root, CHECKPOINT_FILE), EMPTY_CHECKPOINT, 'utf8');
  return root;
}
async function prepareChannel(input: { readonly harness: ProcessHarnessId | InProcessHarnessId; readonly root: string; readonly sessionId: string; readonly window: SimulatedWindow }): Promise<SessionChannel> {
  if (isInProcess(input.harness)) return await createInProcessSession({ root: input.root, harness: input.harness, sessionId: input.sessionId, window: input.window, kind: 'code', seedCharacters: seedCharactersFor(input.window) });
  await installHarness(input.root, input.harness);
  await runGit(['add', '-A'], input.root);
  await runGit(['commit', '-m', 'install context-brake'], input.root);
  return createProcessSession({ root: input.root, harness: input.harness, sessionId: input.sessionId });
}
async function assertSession(input: { readonly root: string; readonly harness: HarnessId; readonly sessionId: string; readonly recorder: SessionRecorder; readonly profile: AgentProfile }): Promise<void> {
  const summary = `${input.harness}/${input.profile}: ${input.recorder.report()}`;
  for (const record of input.recorder.records) {
    expect(record.outcome, summary).toBe(expectedOutcome(record.step.expectation, input.harness));
    if (record.step.expectation === 'failure_deny') expect(record.response, summary).toContain('reason=integration_failure');
  }
  const key = { harness: input.harness, sessionId: input.sessionId, agentId: null };
  const lines = await readLedgerLines(input.root, key);
  expect(lines.some((line) => line.type === 'tool' && line.turn >= 12 && line.zone === 'CRITICAL'), summary).toBe(true);
  if (input.profile === 'compaction') expect(lines.some((line) => line.type === 'reset'), summary).toBe(true);
  if (input.profile === 'subagent') expect((await readLedgerLines(input.root, { ...key, agentId: 'sub-1' })).length, summary).toBeGreaterThan(0);
  expect(JSON.parse(await readFile(join(input.root, CHECKPOINT_FILE), 'utf8')), summary).toMatchObject({ schemaVersion: 1 });
  expect(await lastCommitSubject(input.root), summary).toBe('checkpoint: step 1');
  expect(existsSync(join(input.root, 'src/generated.ts')), summary).toBe(false);
  expect(existsSync(join(input.root, 'src')), summary).toBe(true);
  if (input.profile === 'failure_above_ceiling') expect(await readFile(join(input.root, '.context-brake/runtime/errors.jsonl'), 'utf8'), summary).toContain('INVALID_CONFIG');
}
async function runSession(harness: ProcessHarnessId | InProcessHarnessId, index: number): Promise<void> {
  const window = SIMULATED_WINDOWS[index % SIMULATED_WINDOWS.length]!;
  const profile = profileFor(harness, index);
  const sessionId = `long-${harness}-${index}`;
  const root = await createRoot(window);
  try {
    const channel = await prepareChannel({ harness, root, sessionId, window });
    await seedRedSession({ root, harness, window, sessionId });
    const recorder = new SessionRecorder();
    await runScript({ channel, harness, recorder, root }, sessionSteps(profile));
    await assertSession({ root, harness, sessionId, recorder, profile });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

describe('T09 simulated long-task efficacy (TC-23, CA-21)', () => {
  for (const harness of LONG_TASK_HARNESSES) {
    for (let index = 0; index < SESSION_COUNT; index += 1) {
      it.concurrent(`runs ${harness} session ${index} without an out-of-allowlist call at or above the ceiling`, async (ctx) => {
        await requireGit(ctx, await attemptGit());
        await runSession(harness, index);
      }, SESSION_TIMEOUT_MS);
    }
  }
});
