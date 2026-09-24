import { vi } from 'vitest';
import { parseCliArgs, type ParsedRunArgs } from '../../src/cli/argument-parser.js';
import { dispatchCommand } from '../../src/cli/composition-root.js';
import { captureOutput, type CapturedOutput } from './wrap-world.js';
import { runEnvironment, type RunProject } from './run-project.js';

export type CommandOutcome = { readonly code: number; readonly output: CapturedOutput };

export async function useRunEnvironment(world: RunProject, withHarness = true): Promise<void> {
  const environment = await runEnvironment(world, { withHarness });
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
}

export function runArgs(extra: readonly string[]): ParsedRunArgs {
  return parseCliArgs(['run', '--harness', 'claude-code', ...extra]) as ParsedRunArgs;
}

export async function dispatchRun(world: RunProject, extra: readonly string[]): Promise<CommandOutcome> {
  const output = captureOutput();
  const code = await dispatchCommand(runArgs(extra), { projectRoot: world.project });
  return { code, output };
}

export function restoreRunEnvironment(): void {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
}
