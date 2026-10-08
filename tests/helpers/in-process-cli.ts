import { vi } from 'vitest';
import { main } from '../../src/cli/main.js';
import type { CommandEnv } from '../../src/cli/commands/init.js';
import { applyEnvironment, type EnvironmentOverrides } from './environment-overrides.js';
import { fakeOverheadMeasurer } from './fake-overhead-measurer.js';
import { fakeProcessRunner } from './fake-process-runner.js';

export type InProcessRunResult = { readonly code: number; readonly stdout: string; readonly stderr: string };
export type InProcessOptions = { readonly cwd: string; readonly env?: EnvironmentOverrides; readonly overrides?: Partial<CommandEnv> };

const NO_TERMINAL = { stdinIsTty: false, stdoutIsTty: false };

export async function runInProcessCliWith(args: readonly string[], options: InProcessOptions): Promise<InProcessRunResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const out = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdout.push(String(chunk)); return true; });
  const err = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => { stderr.push(String(chunk)); return true; });
  const restoreEnvironment = applyEnvironment(options.env ?? {});
  try {
    const code = await main(args, { projectRoot: options.cwd, overheadMeasurer: fakeOverheadMeasurer, runner: fakeProcessRunner, terminal: NO_TERMINAL, ...options.overrides });
    return { code, stdout: stdout.join(''), stderr: stderr.join('') };
  } finally {
    restoreEnvironment();
    out.mockRestore();
    err.mockRestore();
  }
}

export async function runInProcessCli(args: readonly string[], cwd: string, env: EnvironmentOverrides = {}): Promise<InProcessRunResult> {
  return runInProcessCliWith(args, { cwd, env });
}
