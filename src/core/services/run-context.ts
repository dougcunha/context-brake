import type { BootTokenEstimator, InterruptSignal, RunProgressListener, RunStateAccess, Timer } from '../contracts/run-control.js';
import type { ApprovalStore, CommandApprover, Hasher, HarnessSessionProcess, LedgerWatcher, RunStore, SessionLauncher, StepApprover, ValidationExecutor } from '../contracts/run-ports.js';
import type { RunnerConfiguration } from '../contracts/runner-configuration.js';
import type { Clock } from '../contracts/session-ledger.js';
import type { RunnerPromptFiles } from './runner-prompt.js';

export const RUN_POLL_MILLISECONDS = 1_000;
export const SIGNAL_EXIT_GRACE_MILLISECONDS = 10_000;
export const HARNESS_DETAIL_CHARACTERS = 200;
export const RUN_ID_ENVIRONMENT_VARIABLE = 'CONTEXT_BRAKE_RUN_ID';
export const MILLISECONDS_PER_SECOND = 1_000;

export type RunDependencies = {
  readonly launcher: SessionLauncher;
  readonly sessions: HarnessSessionProcess;
  readonly validator: ValidationExecutor;
  readonly store: RunStore;
  readonly approvals: ApprovalStore;
  readonly commandApprover: CommandApprover;
  readonly stepApprover: StepApprover | null;
  readonly watcher: LedgerWatcher;
  readonly clock: Clock;
  readonly timer: Timer;
  readonly interrupt: InterruptSignal;
  readonly state: RunStateAccess;
  readonly boot: BootTokenEstimator;
  readonly hasher: Hasher;
  readonly progress: RunProgressListener;
};

export type RunSettings = {
  readonly runId: string;
  readonly harnessArgs: readonly string[];
  readonly limits: RunnerConfiguration;
  readonly files: RunnerPromptFiles;
};

export type RunContext = { readonly deps: RunDependencies; readonly settings: RunSettings };

export async function waitOrFinish<T>(context: RunContext, pending: Promise<T>): Promise<{ readonly done: true; readonly value: T } | { readonly done: false }> {
  const finished = pending.then((value) => ({ done: true as const, value }));
  const ticked = context.deps.timer.wait(RUN_POLL_MILLISECONDS).then(() => ({ done: false as const }));
  return Promise.race([finished, ticked]);
}
