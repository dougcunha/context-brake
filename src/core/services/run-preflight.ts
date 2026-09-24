import type { CommandForApproval, Hasher } from '../contracts/run-ports.js';
import type { ApprovalsFile } from '../contracts/run-records.js';
import type { PlanStep, PlanStepId, TaskPlan } from '../contracts/task-plan.js';
import { parseTaskPlan } from '../validation/plan-validator.js';

export type PlanReadiness =
  | { readonly kind: 'runnable'; readonly plan: TaskPlan }
  | { readonly kind: 'complete'; readonly plan: TaskPlan }
  | { readonly kind: 'missing_commands'; readonly plan: TaskPlan; readonly stepIds: readonly PlanStepId[] };
export type ApprovalSubject = { readonly taskId: string; readonly stepId: PlanStepId; readonly command: string };

export function assessPlan(input: unknown, filePath: string): PlanReadiness {
  const plan = parseTaskPlan(input, filePath);
  const open = openSteps(plan);
  if (open.length === 0) return { kind: 'complete', plan };
  const stepIds = open.filter((step) => !hasValidationCommand(step)).map((step) => step.id);
  if (stepIds.length > 0) return { kind: 'missing_commands', plan, stepIds };
  return { kind: 'runnable', plan };
}

export function approvalHash(subject: ApprovalSubject, hasher: Hasher): string {
  return hasher.sha256(JSON.stringify([subject.taskId, subject.stepId, subject.command]));
}

export function listValidationCommands(plan: TaskPlan, hasher: Hasher): CommandForApproval[] {
  return openSteps(plan).flatMap((step) => {
    if (!hasValidationCommand(step)) return [];
    const command = step.validationCommand;
    return [{ stepId: step.id, command, hash: approvalHash({ taskId: plan.taskId, stepId: step.id, command }, hasher) }];
  });
}

export function unapprovedCommands(commands: readonly CommandForApproval[], approvals: ApprovalsFile): CommandForApproval[] {
  const approved = new Set(approvals.approved.map((entry) => entry.hash));
  return commands.filter((command) => !approved.has(command.hash));
}

function openSteps(plan: TaskPlan): PlanStep[] {
  return plan.steps.filter((step) => step.status !== 'COMPLETED');
}

function hasValidationCommand(step: PlanStep): step is PlanStep & { validationCommand: string } {
  return step.validationCommand !== null && step.validationCommand.trim() !== '';
}
