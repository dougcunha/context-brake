import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { NodeGitInspector } from '../../src/infrastructure/git/git-inspector.js';
import { NodeProcessRunner } from '../../src/infrastructure/process/node-process-runner.js';
import { NodeBootReader } from '../../src/infrastructure/runtime/boot-reader.js';
import { attemptGit, requireGit, runGit } from '../helpers/git-capability.js';
import { seedValidBoot } from '../helpers/boot-fixture.js';

const runner = new NodeProcessRunner();
const clock = { now: () => new Date('2026-09-22T12:00:00.000Z') };
let gitAttempt: Awaited<ReturnType<typeof attemptGit>>;
beforeAll(async () => { gitAttempt = await attemptGit(); });

async function repository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-budget-git-'));
  await runGit(['init'], root);
  await runGit(['config', 'user.name', 'ContextBrake Test'], root);
  await runGit(['config', 'user.email', 'test@example.invalid'], root);
  await writeFile(join(root, 'note.txt'), 'first\n');
  await runGit(['add', 'note.txt'], root);
  await runGit(['commit', '-m', 'first'], root);
  return root;
}

describe('boot Git inspection budget overrun (DEC-EX-T14B, RF16, TC-12)', () => {
  it('degrades real inspection to the checks_omitted source state when the budget elapses', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const root = await repository();
    try {
      const state = await new NodeGitInspector(runner, root, { budgetMilliseconds: 1 }).inspect(null);
      expect(state).toEqual({ status: 'unavailable', reason: 'inspection_failed' });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('delivers boot content with omitted repository checks on overrun', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const root = await repository();
    try {
      await seedValidBoot(root);
      const reader = new NodeBootReader({
        projectRoot: root, config: DEFAULT_CONFIG, clock,
        gitInspector: new NodeGitInspector(runner, root, { budgetMilliseconds: 1 }),
        reportInspectionFailure: undefined,
      });
      const boot = await reader.readBoot();
      expect(boot.kind).toBe('boot');
      if (boot.kind !== 'boot') return;
      expect(boot.text).toContain('Task: Alpha Task (task-alpha)');
      expect(boot.text).toContain('Repository checks omitted: inspection_failed.');
      expect(boot.text).toContain('Before any edit, run `npm run check` to validate step 3.');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
