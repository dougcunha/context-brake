import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ProcessRunner } from '../../src/core/contracts/processes.js';
import { NodeGitInspector } from '../../src/infrastructure/git/git-inspector.js';
import { NodeProcessRunner } from '../../src/infrastructure/process/node-process-runner.js';
import { attemptGit, requireGit, runGit } from '../helpers/git-capability.js';

const runner = new NodeProcessRunner();
let gitAttempt: Awaited<ReturnType<typeof attemptGit>>;
beforeAll(async () => { gitAttempt = await attemptGit(); });

async function repository(): Promise<{ root: string; first: string; second: string }> {
  const root = await mkdtemp(join(tmpdir(), 'cb-t03-git-'));
  await runGit(['init'], root);
  await runGit(['symbolic-ref', 'HEAD', 'refs/heads/main'], root);
  await runGit(['config', 'user.name', 'ContextBrake Test'], root);
  await runGit(['config', 'user.email', 'test@example.invalid'], root);
  await writeFile(join(root, 'note.txt'), 'first\n');
  await runGit(['add', 'note.txt'], root);
  await runGit(['commit', '-m', 'first'], root);
  const first = (await runGit(['rev-parse', 'HEAD'], root)).trim();
  await writeFile(join(root, 'note.txt'), 'second\n');
  await runGit(['commit', '-am', 'second'], root);
  const second = (await runGit(['rev-parse', 'HEAD'], root)).trim();
  return { root, first, second };
}

describe('git inspector in a temporary repository (RF14, TC-09, TC-10)', () => {
  it('reads branch, head, ancestry, and a clean tree', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const repo = await repository();
    try {
      expect(await new NodeGitInspector(runner, repo.root).inspect(repo.first)).toEqual({
        status: 'available', branch: 'main', headCommit: repo.second,
        cleanWorkingTree: true, recordedCommit: 'ancestor',
      });
    } finally { await rm(repo.root, { recursive: true, force: true }); }
  });

  it('detects dirty tree and a missing recorded commit', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const repo = await repository();
    try {
      await writeFile(join(repo.root, 'new.txt'), 'untracked\n');
      const state = await new NodeGitInspector(runner, repo.root).inspect('f'.repeat(40));
      expect(state).toMatchObject({ status: 'available', cleanWorkingTree: false, recordedCommit: 'missing' });
    } finally { await rm(repo.root, { recursive: true, force: true }); }
  });
});

describe('git inspector branch history (RF14, TC-09)', () => {
  it('detects an existing commit outside current branch history', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const repo = await repository();
    try {
      await runGit(['checkout', '-b', 'side', repo.first], repo.root);
      await writeFile(join(repo.root, 'side.txt'), 'side\n');
      await runGit(['add', 'side.txt'], repo.root);
      await runGit(['commit', '-m', 'side'], repo.root);
      const side = (await runGit(['rev-parse', 'HEAD'], repo.root)).trim();
      await runGit(['checkout', 'main'], repo.root);
      expect(await new NodeGitInspector(runner, repo.root).inspect(side)).toMatchObject({
        status: 'available', headCommit: repo.second, recordedCommit: 'outside_history',
      });
    } finally { await rm(repo.root, { recursive: true, force: true }); }
  });
});

describe('git inspector unborn branch (RF14)', () => {
  it('marks a recorded commit outside an unborn branch history', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const repo = await repository();
    try {
      await runGit(['symbolic-ref', 'HEAD', 'refs/heads/unborn'], repo.root);
      expect(await new NodeGitInspector(runner, repo.root).inspect(repo.first)).toMatchObject({
        status: 'available', headCommit: null, recordedCommit: 'outside_history',
      });
    } finally { await rm(repo.root, { recursive: true, force: true }); }
  });
});

describe('git inspector unavailable paths (RF16, TC-12)', () => {
  it('omits checks outside a repository', async (ctx) => {
    await requireGit(ctx, gitAttempt);
    const root = await mkdtemp(join(tmpdir(), 'cb-t03-no-repo-'));
    try {
      expect(await new NodeGitInspector(runner, root).inspect(null)).toEqual({ status: 'unavailable', reason: 'not_repository' });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('does not run git when discovery reports it missing', async () => {
    const run = vi.fn();
    const missing = { discover: vi.fn().mockResolvedValue([{ name: 'git', path: null, timedOut: false }]), run } as unknown as ProcessRunner;
    expect(await new NodeGitInspector(missing, '.').inspect(null)).toEqual({ status: 'unavailable', reason: 'git_missing' });
    expect(run).not.toHaveBeenCalled();
  });
});
