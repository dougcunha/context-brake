import type { GitInspector, GitState } from '../../core/contracts/git.js';
import type { ProcessResult, ProcessRunner } from '../../core/contracts/processes.js';
import { DeadlineExceededError, runWithinDeadline } from '../../core/services/failure-policy.js';

const GIT_TIMEOUT_MS = 3_000;
const GIT_COMMIT_PATTERN = /^[0-9a-fA-F]{4,64}$/;
const INSPECTION_FAILED: GitState = { status: 'unavailable', reason: 'inspection_failed' };
const BUDGET_TIMED_OUT: ProcessResult = { status: 'timed_out', exitCode: null, stdout: '', stderr: '' };

export type GitInspectorOptions = {
  readonly timeoutMilliseconds?: number;
  readonly budgetMilliseconds?: number;
};
type RunWindow = { readonly git: string; readonly deadline: number | null };

function succeeded(result: ProcessResult): boolean {
  return result.status === 'completed' && result.exitCode === 0;
}

export class NodeGitInspector implements GitInspector {
  constructor(
    private readonly runner: ProcessRunner,
    private readonly repositoryRoot: string,
    private readonly options: GitInspectorOptions = {},
  ) {}

  async inspect(recordedCommit: string | null): Promise<GitState> {
    const budget = this.options.budgetMilliseconds;
    if (budget === undefined) return await this.inspectChain(recordedCommit, null);
    try {
      return await runWithinDeadline(this.inspectChain(recordedCommit, Date.now() + budget), budget);
    } catch (error) {
      if (error instanceof DeadlineExceededError) return INSPECTION_FAILED;
      throw error;
    }
  }

  private async inspectChain(recordedCommit: string | null, deadline: number | null): Promise<GitState> {
    const window = await this.discoverGit(deadline);
    if ('status' in window) return window;
    const repository = await this.run(window, ['rev-parse', '--is-inside-work-tree']);
    if (repository.status !== 'completed') return INSPECTION_FAILED;
    if (!succeeded(repository) || repository.stdout.trim() !== 'true') return { status: 'unavailable', reason: 'not_repository' };
    const branch = await this.run(window, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
    const head = await this.run(window, ['rev-parse', '--verify', 'HEAD']);
    const tree = await this.run(window, ['status', '--porcelain', '--untracked-files=all']);
    if (tree.status !== 'completed' || tree.exitCode !== 0 || head.status !== 'completed' || branch.status !== 'completed') {
      return INSPECTION_FAILED;
    }
    const headCommit = succeeded(head) ? head.stdout.trim() : null;
    const commitStatus = await this.recordedCommitStatus(window, recordedCommit, headCommit);
    if (commitStatus === 'inspection_failed') return INSPECTION_FAILED;
    return {
      status: 'available', branch: succeeded(branch) ? branch.stdout.trim() : null,
      headCommit, cleanWorkingTree: tree.stdout.trim().length === 0, recordedCommit: commitStatus,
    };
  }

  private async discoverGit(deadline: number | null): Promise<RunWindow | GitState> {
    const timeout = this.remainingTimeout(deadline);
    if (timeout === null) return INSPECTION_FAILED;
    const [git] = await this.runner.discover({ names: ['git'], timeoutMilliseconds: timeout });
    if (this.remainingTimeout(deadline) === null) return INSPECTION_FAILED;
    if (git === undefined || git.path === null || git.timedOut) return { status: 'unavailable', reason: 'git_missing' };
    return { git: git.path, deadline };
  }

  private async recordedCommitStatus(
    window: RunWindow, recorded: string | null, head: string | null,
  ): Promise<'not_checked' | 'ancestor' | 'missing' | 'outside_history' | 'inspection_failed'> {
    if (recorded === null) return 'not_checked';
    if (!GIT_COMMIT_PATTERN.test(recorded)) return 'missing';
    const exists = await this.run(window, ['cat-file', '-e', `${recorded}^{commit}`]);
    if (exists.status !== 'completed') return 'inspection_failed';
    if (exists.exitCode !== 0) return 'missing';
    if (head === null) return 'outside_history';
    const ancestor = await this.run(window, ['merge-base', '--is-ancestor', recorded, 'HEAD']);
    if (ancestor.status !== 'completed') return 'inspection_failed';
    if (ancestor.exitCode === 0) return 'ancestor';
    return ancestor.exitCode === 1 ? 'outside_history' : 'inspection_failed';
  }

  private run(window: RunWindow, args: readonly string[]): Promise<ProcessResult> {
    const timeout = this.remainingTimeout(window.deadline);
    if (timeout === null) return Promise.resolve(BUDGET_TIMED_OUT);
    return this.runner.run({ executable: window.git, args: ['-C', this.repositoryRoot, ...args], timeoutMilliseconds: timeout });
  }

  private remainingTimeout(deadline: number | null): number | null {
    const perCommand = this.options.timeoutMilliseconds ?? GIT_TIMEOUT_MS;
    if (deadline === null) return perCommand;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    return Math.min(perCommand, remaining);
  }
}
