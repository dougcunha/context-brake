import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { installBuiltHook, runInstalledHook, runInstalledHookWithEnvironment } from '../helpers/built-hook.js';
import { VALID_BOOT_CHECKPOINT, seedValidBoot } from '../helpers/boot-fixture.js';
import { attemptGit, requireGit, runGit } from '../helpers/git-capability.js';

let gitAttempt: Awaited<ReturnType<typeof attemptGit>>;
beforeAll(async () => { gitAttempt = await attemptGit(); });
async function repository(): Promise<{ root: string; head: string }> {
  const root = await mkdtemp(join(tmpdir(), 'cb-boot-git-'));
  await seedValidBoot(root);
  await runGit(['init'], root);
  await runGit(['symbolic-ref', 'HEAD', 'refs/heads/main'], root);
  await runGit(['config', 'user.name', 'ContextBrake Test'], root);
  await runGit(['config', 'user.email', 'test@example.invalid'], root);
  await writeFile(join(root, '.gitignore'), 'context-brake.config.json\ntask_plan.json\nstate_checkpoint.json\n.claude/\n');
  await writeFile(join(root, 'note.txt'), 'first\n');
  await runGit(['add', '.gitignore', 'note.txt'], root);
  await runGit(['commit', '-m', 'first'], root);
  return { root, head: (await runGit(['rev-parse', 'HEAD'], root)).trim() };
}
async function setRecordedCommit(root: string, commit: string): Promise<void> {
  const checkpoint = { ...VALID_BOOT_CHECKPOINT, gitState: { ...VALID_BOOT_CHECKPOINT.gitState, branch: 'main', lastCommitHash: commit } };
  await writeFile(join(root, 'state_checkpoint.json'), JSON.stringify(checkpoint));
}
async function deliveredBoot(root: string): Promise<string> {
  const hook = await installBuiltHook('claude-code', root);
  const result = await runInstalledHook(hook, 'SessionStart', { session_id: 's1', hook_event_name: 'SessionStart', source: 'startup' });
  expect(result.code).toBe(0);
  return (JSON.parse(result.stdout) as { hookSpecificOutput: { additionalContext: string } }).hookSpecificOutput.additionalContext;
}
describe('built hook repository divergence (RF14, CA-09, CA-10)', () => {
  it('reports dirty tree and missing recorded commit', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const { root } = await repository();
    try {
      const missing = 'f'.repeat(40);
      await setRecordedCommit(root, missing);
      await writeFile(join(root, 'pending.txt'), 'pending\n');
      const boot = await deliveredBoot(root);
      expect(boot).toContain(`Checkpoint commit ${missing} is missing.`);
      expect(boot).toContain('Working tree has uncommitted changes.');
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('names both commits when the recorded commit is outside history', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const { root, head } = await repository();
    try {
      await runGit(['checkout', '-b', 'side'], root);
      await writeFile(join(root, 'side.txt'), 'side\n');
      await runGit(['add', 'side.txt'], root);
      await runGit(['commit', '-m', 'side'], root);
      const side = (await runGit(['rev-parse', 'HEAD'], root)).trim();
      await runGit(['checkout', 'main'], root);
      await setRecordedCommit(root, side);
      expect(await deliveredBoot(root)).toContain(`Checkpoint commit ${side} is outside current history at ${head}.`);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});

describe('built hook repository availability (RF14, RF16, CA-12)', () => {
  it('reports no false divergence in a clean repository', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const { root, head } = await repository();
    try {
      await setRecordedCommit(root, head);
      expect(await deliveredBoot(root)).toContain('## Repository state\n- None');
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('reports omitted checks outside a repository', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const root = await mkdtemp(join(tmpdir(), 'cb-boot-no-repo-'));
    try {
      await seedValidBoot(root);
      expect(await deliveredBoot(root)).toContain('Repository checks omitted: not_repository.');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});

describe('built hook without Git (RF16, CA-12)', () => {
  it('reports omitted checks when Git is absent from the hook environment', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cb-boot-no-git-'));
    try {
      await seedValidBoot(root);
      const hookPath = await installBuiltHook('claude-code', root);
      const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'));
      const result = await runInstalledHookWithEnvironment({
        hookPath, event: 'SessionStart', payload: { session_id: 's1', hook_event_name: 'SessionStart', source: 'startup' },
        environment: { ...environment, PATH: '' },
      });
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Repository checks omitted: git_missing.');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
