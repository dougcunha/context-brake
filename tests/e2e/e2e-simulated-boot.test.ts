import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { attemptGit, requireGit, runGit } from '../helpers/git-capability.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { bootAdherenceSteps } from '../support/harness-simulator/agent-profiles.js';
import { createInProcessSession, type InProcessHarnessId } from '../support/harness-simulator/in-process-driver.js';
import { createProcessSession, installHarness, type ProcessHarnessId } from '../support/harness-simulator/process-driver.js';
import { CHECKPOINT_FILE, PLAN_FILE, VALIDATION_COMMAND, checkpointContent, planContent } from '../support/harness-simulator/scenarios.js';
import { SessionRecorder, initializeRepository, runScript, type SessionChannel } from '../support/harness-simulator/session-recorder.js';

const ALL_HARNESSES: readonly (ProcessHarnessId | InProcessHarnessId)[] = ['claude-code', 'codex-cli', 'cursor', 'github-copilot-cli', 'pi', 'oh-my-pi'];
const COMPACT_HARNESSES: readonly (ProcessHarnessId | InProcessHarnessId)[] = ['claude-code', 'codex-cli', 'pi', 'oh-my-pi'];
const EXCLUDED_COMPACT: readonly ProcessHarnessId[] = ['cursor', 'github-copilot-cli'];

function isInProcess(harness: ProcessHarnessId | InProcessHarnessId): harness is InProcessHarnessId {
  return harness === 'pi' || harness === 'oh-my-pi';
}
async function setupBootRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-t09-boot-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/app.ts'), 'export const app = true;\n', 'utf8');
  await writeRuntimeConfig(root, 128000);
  await initializeRepository(root);
  await writeFile(join(root, PLAN_FILE), planContent(), 'utf8');
  await writeFile(join(root, CHECKPOINT_FILE), checkpointContent(), 'utf8');
  return root;
}
async function openChannel(root: string, harness: ProcessHarnessId | InProcessHarnessId, id: string): Promise<SessionChannel> {
  if (isInProcess(harness)) return await createInProcessSession({ root, harness, sessionId: id, window: 128000, kind: 'code', seedCharacters: 1000 });
  await installHarness(root, harness);
  await runGit(['add', '-A'], root);
  await runGit(['commit', '-m', 'install context-brake'], root);
  return createProcessSession({ root, harness, sessionId: id });
}
async function runWithBootRoot(action: (root: string) => Promise<void>): Promise<void> {
  const root = await setupBootRoot();
  try { await action(root); } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
async function assertBoot(harness: ProcessHarnessId | InProcessHarnessId, source: 'startup' | 'compact', assertFn: (b: string | null) => void): Promise<void> {
  await runWithBootRoot(async (root) => {
    const ch = await openChannel(root, harness, `boot-${source}-${harness}`);
    assertFn((await ch.boot?.(source)) ?? null);
  });
}
describe('T09 simulated boot startup (RF9, CA-05)', () => {
  for (const h of ALL_HARNESSES) {
    it(`delivers boot on session startup for ${h}`, async (ctx) => {
      await requireGit(ctx, await attemptGit());
      await assertBoot(h, 'startup', (b) => {
        expect(b).toContain('Task 1 (task-1)');
        expect(b).toContain('Step 1 (IN_PROGRESS)');
        expect(b).toContain(`Before any edit, run \`${VALIDATION_COMMAND}\` to validate step 1.`);
      });
    });
  }
});
describe('T09 simulated boot compaction (RF9, DEC-15)', () => {
  for (const h of COMPACT_HARNESSES) {
    it(`delivers boot post-compaction for ${h}`, async (ctx) => {
      await requireGit(ctx, await attemptGit());
      await assertBoot(h, 'compact', (b) => expect(b).toContain('Task 1 (task-1)'));
    });
  }
  for (const h of EXCLUDED_COMPACT) {
    it(`does not deliver boot post-compaction for ${h}`, async (ctx) => {
      await requireGit(ctx, await attemptGit());
      await assertBoot(h, 'compact', (b) => expect(b).toBeNull());
    });
  }
});
describe('T09 simulated boot adherence (RF15, CA-11, TC-11)', () => {
  it('runs validation command within three tool calls before any edit', async (ctx) => {
    await requireGit(ctx, await attemptGit());
    await runWithBootRoot(async (root) => {
      const channel = await openChannel(root, 'claude-code', 'boot-adherence');
      expect(await channel.boot?.('startup')).toContain(`run \`${VALIDATION_COMMAND}\``);
      const recorder = new SessionRecorder();
      await runScript({ channel, harness: 'claude-code', recorder, root }, bootAdherenceSteps());
      const val = recorder.records.findIndex((r) => r.step.call.tool === 'shell' && r.step.call.command === VALIDATION_COMMAND);
      const edit = recorder.records.findIndex((r) => r.step.call.tool === 'write');
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(3);
      expect(edit).toBeGreaterThan(val);
    });
  });
});
