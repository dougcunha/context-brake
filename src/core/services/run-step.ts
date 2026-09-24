import type { ValidationOutcome } from '../contracts/run-ports.js';
import type { RunLimit, RunStopReason, StatusCorrection, ValidationRecord } from '../contracts/run-records.js';
import type { PlanStepId, TaskPlan } from '../contracts/task-plan.js';
import { ensureCommandsApproved } from './run-approvals.js';
import { MILLISECONDS_PER_SECOND, waitOrFinish, type RunContext } from './run-context.js';
import { approvalHash } from './run-preflight.js';
import type { SessionOutcome } from './run-session.js';
import type { PreviousFailure } from './runner-prompt.js';
import { decideSessionGate, reconcilePlan } from './session-evaluation.js';

export type RunStop = { readonly reason: RunStopReason; readonly limit: RunLimit | null };
export type SettleInput = { readonly session: SessionOutcome; readonly before: TaskPlan; readonly stepId: PlanStepId };
export type Settlement = {
  readonly validation: ValidationRecord;
  readonly statusCorrections: readonly StatusCorrection[];
  readonly passed: boolean | null;
  readonly outputTail: string | null;
  readonly failure: PreviousFailure | null;
  readonly plan: TaskPlan | null;
  readonly stop: RunStop | null;
};
type ValidationInput = SettleInput & { readonly after: TaskPlan };

const NOT_RUN: ValidationRecord = { status: 'not_run', exitCode: null, durationMs: null };
const UNSETTLED: Settlement = { validation: NOT_RUN, statusCorrections: [], passed: null, outputTail: null, failure: null, plan: null, stop: null };

export function haltedSettlement(reason: RunStopReason): Settlement {
  return { ...UNSETTLED, stop: { reason, limit: null } };
}

export async function settleSession(context: RunContext, input: SettleInput): Promise<Settlement> {
  const { endReason, startedAt } = input.session;
  if (endReason === 'interrupted' || endReason === 'harness_error') return haltedSettlement(endReason);
  const reading = await context.deps.state.read();
  const gate = decideSessionGate({ endReason, sessionStartedAt: startedAt, stepId: input.stepId, plan: reading.plan, checkpoint: reading.checkpoint });
  if (gate.kind === 'no_checkpoint' || reading.plan === null) return haltedSettlement('no_checkpoint');
  if (gate.kind === 'step_removed') return { ...UNSETTLED, plan: reading.plan };
  return validateStep(context, { ...input, after: reading.plan });
}

async function validateStep(context: RunContext, input: ValidationInput): Promise<Settlement> {
  const command = input.after.steps.find((step) => step.id === input.stepId)?.validationCommand ?? null;
  if (command === null || command.trim() === '') return haltedSettlement('no_checkpoint');
  const hash = approvalHash({ taskId: input.after.taskId, stepId: input.stepId, command }, context.deps.hasher);
  if (!(await ensureCommandsApproved(context, [{ stepId: input.stepId, command, hash }]))) return haltedSettlement('confirmation_required');
  const outcome = await executeValidation(context, command);
  if (outcome === null) return haltedSettlement('interrupted');
  return applyValidation(context, input, outcome);
}

async function executeValidation(context: RunContext, command: string): Promise<ValidationOutcome | null> {
  if (context.deps.interrupt.isRequested()) return null;
  const running = context.deps.validator.start({ command, timeoutMilliseconds: context.settings.limits.validationTimeoutSeconds * MILLISECONDS_PER_SECOND });
  for (;;) {
    if (context.deps.interrupt.isRequested()) {
      await running.stop();
      return null;
    }
    const result = await waitOrFinish(context, running.outcome);
    if (result.done) return result.value;
  }
}

async function applyValidation(context: RunContext, input: ValidationInput, outcome: ValidationOutcome): Promise<Settlement> {
  const passed = outcome.status === 'passed';
  const reconciliation = reconcilePlan({ before: input.before, after: input.after, stepId: input.stepId, passed });
  if (reconciliation.changed) await context.deps.state.writePlan(reconciliation.plan);
  return {
    validation: { status: outcome.status, exitCode: outcome.exitCode, durationMs: outcome.durationMs },
    statusCorrections: reconciliation.statusCorrections,
    passed,
    outputTail: outcome.outputTail,
    failure: toFailure(outcome),
    plan: reconciliation.plan,
    stop: null,
  };
}

function toFailure(outcome: ValidationOutcome): PreviousFailure | null {
  if (outcome.status === 'passed') return null;
  return { status: outcome.status, exitCode: outcome.exitCode, outputTail: outcome.outputTail };
}
