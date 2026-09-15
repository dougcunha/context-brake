import { spawn } from 'node:child_process';

const PROBE_TIMEOUT_MS = 5000;

export type ProcessAttempt = { readonly available: boolean; readonly reason: string };
export type ProcessPolicy = { readonly action: 'proceed' } | { readonly action: 'skip' | 'fail'; readonly reason: string };

export class MissingPrerequisiteError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'MissingPrerequisiteError';
  }
}

function unavailableReason(file: string, detail: string): string {
  return `${file} is unavailable on ${process.platform}: ${detail}`;
}

export function ciRequiresProcesses(): boolean {
  return process.env.CI === 'true' || process.env.CI === '1';
}

export function processPolicy(attempt: ProcessAttempt, ciRequired: boolean): ProcessPolicy {
  if (attempt.available) return { action: 'proceed' };
  return ciRequired ? { action: 'fail', reason: attempt.reason } : { action: 'skip', reason: attempt.reason };
}

export function attemptExecutable(file: string, args: readonly string[], timeoutMs = PROBE_TIMEOUT_MS): Promise<ProcessAttempt> {
  return new Promise((resolve) => {
    let settled = false;
    function finish(attempt: ProcessAttempt): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(attempt);
    }
    const child = spawn(file, [...args], { stdio: 'ignore' });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ available: false, reason: unavailableReason(file, `probe timed out after ${timeoutMs}ms`) });
    }, timeoutMs);
    child.on('error', (error) => finish({ available: false, reason: unavailableReason(file, error.message) }));
    child.on('close', (code) => finish(code === 0 ? { available: true, reason: '' } : { available: false, reason: unavailableReason(file, `probe exited with code ${code}`) }));
  });
}

export function attemptGitProcess(): Promise<ProcessAttempt> {
  return attemptExecutable('git', ['--version']);
}

export function attemptShellProcess(shell: string): Promise<ProcessAttempt> {
  return attemptExecutable(shell, ['-c', 'exit 0']);
}

export async function requireProcess(ctx: { skip: (note?: string) => never }, attempt: ProcessAttempt): Promise<void> {
  const policy = processPolicy(attempt, ciRequiresProcesses());
  if (policy.action === 'fail') throw new MissingPrerequisiteError(policy.reason);
  if (policy.action === 'skip') ctx.skip(policy.reason);
}
