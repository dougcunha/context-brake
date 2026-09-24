import type { RunLimit, RunOutcome, RunSessionLine, RunStopReason, TokenCount } from '../contracts/run-records.js';
import { RUN_SUMMARY_SCHEMA_VERSION, type DecisionRequest, type RunSummary } from '../contracts/run-summary.js';
import type { PlanStepId, TaskPlan } from '../contracts/task-plan.js';

export type RunResult = {
  readonly runId: string | null;
  readonly status: RunOutcome;
  readonly stopReason: RunStopReason;
  readonly limit: RunLimit | null;
  readonly durationMs: number;
  readonly sessions: readonly RunSessionLine[];
  readonly tokens: TokenCount;
  readonly plan: TaskPlan | null;
  readonly decisionStepId: PlanStepId | null;
  readonly outputTail: string | null;
  readonly harnessArgs: readonly string[];
};

const RERUN = 'rerun context-brake run to resume from the plan';
const DECISION_OPTIONS: Partial<Record<RunStopReason, readonly string[]>> = {
  repeated_failure: ['edit the plan or the step validation command', 'raise --max-failures', RERUN],
  no_checkpoint: ['inspect the plan and checkpoint the session left', 'restore or update the checkpoint', RERUN],
  harness_error: ['check the harness login and connectivity', RERUN],
  step_not_approved: ['review the validated step', 'rerun context-brake run to continue'],
  confirmation_required: ['review the listed validation commands', 'rerun with --approve-commands or approve them on a terminal'],
};

export function decisionFor(result: Pick<RunResult, 'stopReason' | 'decisionStepId'>): DecisionRequest | undefined {
  const options = DECISION_OPTIONS[result.stopReason];
  if (options === undefined) return undefined;
  return { reason: result.stopReason, stepId: result.decisionStepId, options: [...options] };
}

export function buildRunSummary(result: RunResult, exitCode: number): RunSummary {
  const steps = result.plan?.steps ?? [];
  const decision = decisionFor(result);
  return {
    schemaVersion: RUN_SUMMARY_SCHEMA_VERSION,
    command: 'run',
    runId: result.runId,
    status: result.status,
    exitCode,
    stopReason: result.stopReason,
    limit: result.limit,
    stepsCompleted: steps.filter((step) => step.status === 'COMPLETED').length,
    stepsTotal: steps.length,
    sessionCount: result.sessions.length,
    durationMs: result.durationMs,
    tokens: result.tokens,
    harnessArgs: [...result.harnessArgs],
    sessions: [...result.sessions],
    ...(decision === undefined ? {} : { decision }),
  };
}
