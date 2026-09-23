import { describe, expect, it } from 'vitest';
import type { ProcessRequest, ProcessResult, ProcessRunner } from '../../src/core/contracts/processes.js';
import { NodeGitInspector } from '../../src/infrastructure/git/git-inspector.js';

function completed(stdout: string, exitCode = 0): ProcessResult {
  return { status: 'completed', exitCode, stdout, stderr: '' };
}

function replyTo(request: ProcessRequest): ProcessResult {
  const command = request.args[2] ?? '';
  if (command === 'rev-parse') return completed(request.args.includes('--is-inside-work-tree') ? 'true' : 'abc123');
  if (command === 'symbolic-ref') return completed('main');
  return completed('');
}

type RecordedRunner = { readonly requests: ProcessRequest[]; readonly runner: ProcessRunner };

function recordingRunner(reply: (request: ProcessRequest) => Promise<ProcessResult>): RecordedRunner {
  const requests: ProcessRequest[] = [];
  const runner: ProcessRunner = {
    discover: async (search) => {
      requests.push({ executable: 'discover', args: [...search.names], timeoutMilliseconds: search.timeoutMilliseconds });
      return [{ name: 'git', path: 'git', timedOut: false }];
    },
    run: async (request) => {
      requests.push(request);
      return await reply(request);
    },
  };
  return { requests, runner };
}

describe('boot Git inspection sub-budget chain (DEC-EX-T14B, RF16)', () => {
  it('completes the serial chain and reports real state within the budget', async () => {
    const recorded = recordingRunner(async (request) => replyTo(request));
    const state = await new NodeGitInspector(recorded.runner, '.', { budgetMilliseconds: 5_000 }).inspect('abcd');
    expect(state).toEqual({ status: 'available', branch: 'main', headCommit: 'abc123', cleanWorkingTree: true, recordedCommit: 'ancestor' });
  });

  it('degrades to inspection_failed while a command overruns the budget', async () => {
    const recorded = recordingRunner(() => new Promise<ProcessResult>(() => undefined));
    const state = await new NodeGitInspector(recorded.runner, '.', { budgetMilliseconds: 25 }).inspect('abcd');
    expect(state).toEqual({ status: 'unavailable', reason: 'inspection_failed' });
  });

  it('propagates an inspection error beyond the budget race', async () => {
    const recorded = recordingRunner(() => Promise.reject(new Error('spawn failed')));
    const inspection = new NodeGitInspector(recorded.runner, '.', { budgetMilliseconds: 5_000 }).inspect(null);
    await expect(inspection).rejects.toThrow('spawn failed');
  });
});

describe('boot Git inspection sub-budget command timeouts (DEC-EX-T14B)', () => {
  it('clamps every command timeout to the remaining budget', async () => {
    const recorded = recordingRunner(async (request) => replyTo(request));
    await new NodeGitInspector(recorded.runner, '.', { budgetMilliseconds: 400 }).inspect('abcd');
    expect(recorded.requests.every((request) => request.timeoutMilliseconds <= 400)).toBe(true);
  });

  it('keeps the per-command timeout when no budget is configured', async () => {
    const recorded = recordingRunner(async (request) => replyTo(request));
    await new NodeGitInspector(recorded.runner, '.').inspect(null);
    expect(recorded.requests.length).toBeGreaterThan(0);
    expect(recorded.requests.every((request) => request.timeoutMilliseconds === 3_000)).toBe(true);
  });

  it('runs no command once the budget is exhausted', async () => {
    const recorded = recordingRunner(async (request) => replyTo(request));
    const state = await new NodeGitInspector(recorded.runner, '.', { budgetMilliseconds: 0 }).inspect(null);
    expect(state).toEqual({ status: 'unavailable', reason: 'inspection_failed' });
    expect(recorded.requests).toEqual([]);
  });
});
