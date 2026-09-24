import type { SessionEndReason, StatusCorrection } from '../contracts/run-records.js';
import type { StateCheckpoint } from '../contracts/state-checkpoint.js';
import type { PlanStep, PlanStepId, PlanStepStatus, TaskPlan } from '../contracts/task-plan.js';
import { checkpointAgainstPlanIssues } from '../validation/checkpoint-validator.js';

export type SessionGateInput = {
  readonly endReason: SessionEndReason;
  readonly sessionStartedAt: Date;
  readonly stepId: PlanStepId;
  readonly plan: TaskPlan | null;
  readonly checkpoint: StateCheckpoint | null;
};
export type SessionGate = { readonly kind: 'validate' } | { readonly kind: 'no_checkpoint' } | { readonly kind: 'step_removed' };
export type ReconcileInput = { readonly before: TaskPlan; readonly after: TaskPlan; readonly stepId: PlanStepId; readonly passed: boolean };
export type Reconciliation = { readonly plan: TaskPlan; readonly changed: boolean; readonly statusCorrections: readonly StatusCorrection[] };

export function isCheckpointFresh(checkpoint: StateCheckpoint | null, plan: TaskPlan, sessionStartedAt: Date): boolean {
  if (checkpoint === null) return false;
  if (checkpointAgainstPlanIssues(checkpoint, plan).length > 0) return false;
  return Date.parse(checkpoint.timestamp) >= sessionStartedAt.getTime();
}

export function decideSessionGate(input: SessionGateInput): SessionGate {
  if (input.plan === null) return { kind: 'no_checkpoint' };
  if (input.endReason !== 'reset_signal' && !isCheckpointFresh(input.checkpoint, input.plan, input.sessionStartedAt)) return { kind: 'no_checkpoint' };
  if (!input.plan.steps.some((step) => step.id === input.stepId)) return { kind: 'step_removed' };
  return { kind: 'validate' };
}

export function reconcilePlan(input: ReconcileInput): Reconciliation {
  const reverted = input.after.steps.map((step) => ({ ...step, status: revertedStatus(step, input) }));
  const activeId = input.passed ? nextActiveStepId(reverted, input.stepId) : input.stepId;
  const steps = reverted.map((step) => ({ ...step, status: activeStatus(step, activeId) }));
  const reversals = statusChanges(input.after.steps, reverted).filter((change) => !(input.passed && change.stepId === input.stepId));
  const released = statusChanges(reverted, steps).filter((change) => change.stepId !== activeId);
  const plan: TaskPlan = { ...input.after, currentStepId: activeId, steps };
  const changed = JSON.stringify(plan) !== JSON.stringify(input.after);
  return { plan, changed, statusCorrections: [...reversals, ...released] };
}

function revertedStatus(step: PlanStep, input: ReconcileInput): PlanStepStatus {
  if (step.id === input.stepId) return assignedStatus(step.status, input.passed);
  if (step.status !== 'COMPLETED') return step.status;
  return priorStatus(input.before, step);
}

function assignedStatus(status: PlanStepStatus, passed: boolean): PlanStepStatus {
  if (passed) return 'COMPLETED';
  return status === 'COMPLETED' || status === 'FAILED' ? 'IN_PROGRESS' : status;
}

function activeStatus(step: PlanStep, activeId: PlanStepId | null): PlanStepStatus {
  if (step.id === activeId) return 'IN_PROGRESS';
  return step.status === 'IN_PROGRESS' ? 'PENDING' : step.status;
}

function nextActiveStepId(steps: readonly PlanStep[], completedId: PlanStepId): PlanStepId | null {
  const index = steps.findIndex((step) => step.id === completedId);
  const next = steps.slice(index + 1).find(isOpen) ?? steps.find(isOpen);
  return next?.id ?? null;
}

function isOpen(step: PlanStep): boolean {
  return step.status !== 'COMPLETED';
}

function priorStatus(before: TaskPlan, step: PlanStep): PlanStepStatus {
  return before.steps.find((candidate) => candidate.id === step.id)?.status ?? 'PENDING';
}

function statusChanges(from: readonly PlanStep[], to: readonly PlanStep[]): StatusCorrection[] {
  return from.flatMap((step, index) => {
    const next = to[index];
    return next === undefined || next.status === step.status ? [] : [{ stepId: step.id, from: step.status, to: next.status }];
  });
}
