import process from 'node:process';
import { RUN_ID_ENVIRONMENT_VARIABLE } from '../../core/services/run-context.js';
import { runPassthrough } from '../../infrastructure/runner/passthrough-process.js';
import { findRunnerSession, renderWrapTelemetry, type RunnerSession } from '../../infrastructure/runner/wrap-telemetry.js';
import type { ParsedWrapArgs } from '../run-arguments.js';
import type { CommandEnv } from './init.js';

export const OUTSIDE_RUNNER_WARNING = `[WARN] context-brake wrap: no active runner session (${RUN_ID_ENVIRONMENT_VARIABLE} is unset or its run has no active session), so no telemetry block was appended. Use wrap inside a session started by context-brake run.\n`;

export async function runWrap(args: ParsedWrapArgs, env: CommandEnv): Promise<number> {
  const session = await lookUpSession(env.projectRoot);
  const result = await runPassthrough({ argv: args.argv, cwd: process.cwd(), streams: { stdout: process.stdout, stderr: process.stderr } });
  if (session === null) {
    process.stderr.write(OUTSIDE_RUNNER_WARNING);
    return result.exitCode;
  }
  await appendTelemetry(session, result.characters);
  return result.exitCode;
}

async function lookUpSession(startDirectory: string): Promise<RunnerSession | null> {
  try {
    return await findRunnerSession(startDirectory, process.env[RUN_ID_ENVIRONMENT_VARIABLE]);
  } catch (error) {
    warnTelemetryUnavailable(error);
    return null;
  }
}

async function appendTelemetry(session: RunnerSession, characters: number): Promise<void> {
  try {
    const block = await renderWrapTelemetry({ ...session, characters });
    process.stdout.write(`\n${block}\n`);
  } catch (error) {
    warnTelemetryUnavailable(error);
  }
}

function warnTelemetryUnavailable(error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[WARN] context-brake wrap: session telemetry is unavailable, so no block was appended: ${detail}\n`);
}
