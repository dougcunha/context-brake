import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export type GitAttempt = { readonly available: boolean; readonly reason: string };
export type GitPolicy = { readonly action: 'proceed' } | { readonly action: 'skip' | 'fail'; readonly reason: string };

export class GitUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'GitUnavailableError';
  }
}

export function ciRequiresGit(): boolean {
  return process.env.CI === 'true' || process.env.CI === '1';
}

export function gitPolicy(attempt: GitAttempt, ciRequired: boolean): GitPolicy {
  if (attempt.available) return { action: 'proceed' };
  return ciRequired ? { action: 'fail', reason: attempt.reason } : { action: 'skip', reason: attempt.reason };
}

export async function attemptGit(): Promise<GitAttempt> {
  try {
    await run('git', ['--version']);
    return { available: true, reason: '' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { available: false, reason: `git is unavailable on ${process.platform}: ${detail}` };
  }
}

export async function runGit(args: readonly string[], cwd: string): Promise<string> {
  const { stdout } = await run('git', [...args], { cwd });
  return stdout;
}

export async function requireGit(ctx: { skip: (note?: string) => never }, attempt: GitAttempt): Promise<void> {
  const policy = gitPolicy(attempt, ciRequiresGit());
  if (policy.action === 'fail') throw new GitUnavailableError(policy.reason);
  if (policy.action === 'skip') ctx.skip(policy.reason);
}
