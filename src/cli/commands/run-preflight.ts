import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { CLI_ERROR_CODES } from '../../core/contracts/diagnostics.js';
import type { SessionLauncher } from '../../core/contracts/run-ports.js';
import type { PlanReadiness } from '../../core/services/run-preflight.js';
import { readPlanForRun } from '../../infrastructure/runner/run-plan-reader.js';
import { prepareHarness } from '../../infrastructure/runner/runner-composition.js';
import type { ParsedRunArgs } from '../run-arguments.js';

export type RunErrorCode = Extract<(typeof CLI_ERROR_CODES)[number], 'INVALID_STATE_FILE' | `RUN_${string}`>;

export class RunCommandError extends Error {
  constructor(readonly code: RunErrorCode, message: string) {
    super(message);
    this.name = 'RunCommandError';
  }
}

const RERUN = 'then rerun context-brake run';
const SUPPORTED_HARNESSES = 'claude-code, codex-cli';

export async function requireLauncher(args: ParsedRunArgs): Promise<SessionLauncher> {
  const preparation = await prepareHarness({ harness: args.harness, harnessArgs: args.harnessArgs });
  if (preparation.kind === 'ready') return preparation.launcher;
  if (preparation.kind === 'unsupported') {
    throw new RunCommandError('RUN_HARNESS_UNSUPPORTED', `context-brake run does not support ${args.harness}: ${preparation.reason}. Supported harnesses: ${SUPPORTED_HARNESSES}.`);
  }
  const names = preparation.executableNames.join(', ');
  throw new RunCommandError('RUN_HARNESS_MISSING', `The ${args.harness} executable (${names}) was not found on PATH. Install it or add its directory to PATH, ${RERUN}.`);
}

export async function requireRunnablePlan(projectRoot: string, config: ContextBrakeConfig): Promise<PlanReadiness> {
  const preflight = await readPlanForRun(projectRoot, config);
  if (preflight.kind === 'missing_plan') {
    const delegated = config.delegatedSnapshot === undefined ? '' : `; context-brake run needs a plan and does not support the delegated snapshot mode`;
    throw new RunCommandError('RUN_PLAN_NOT_RUNNABLE', `No plan exists at ${preflight.file}${delegated}. Run context-brake plan init --task="<name>", add steps with validation commands, ${RERUN}.`);
  }
  if (preflight.kind === 'invalid') {
    throw new RunCommandError('INVALID_STATE_FILE', `State file ${preflight.file} is invalid: ${preflight.detail}. Fix it (context-brake plan status lists every issue), ${RERUN}.`);
  }
  const { readiness } = preflight;
  if (readiness.kind === 'missing_commands') {
    const steps = readiness.stepIds.map(String).join(', ');
    const file = config.stateStorage.planFile;
    throw new RunCommandError('RUN_PLAN_NOT_RUNNABLE', `Steps ${steps} in ${file} have no validationCommand. The runner advances a step only after its validation command passes, so add one to every open step, ${RERUN}.`);
  }
  return readiness;
}
