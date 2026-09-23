import type { GitComparison, GitDivergence } from '../contracts/git.js';
import type { StateCheckpoint } from '../contracts/state-checkpoint.js';
import { findActiveStep, findLastCompletedStep, findNextStep, type PlanStep, type TaskPlan } from '../contracts/task-plan.js';

export const BOOT_SUMMARY_VERSION = 1;

export type BootSummaryInput = {
  readonly plan: TaskPlan;
  readonly checkpoint: StateCheckpoint;
  readonly git: GitComparison;
  readonly checkpointFile: string;
  readonly maxTokens: number;
};

type OptionalLists = { readonly modifiedFiles: readonly string[]; readonly decisions: readonly string[]; readonly reduced: boolean };

function stepLabel(step: PlanStep | null): string {
  return step === null ? 'None' : `${String(step.id)}: ${step.title} (${step.status})`;
}

function listSection(title: string, items: readonly string[]): string[] {
  return [`## ${title}`, ...(items.length === 0 ? ['- None'] : items.map((item) => `- ${item}`))];
}

function divergenceLine(divergence: GitDivergence): string {
  switch (divergence.kind) {
    case 'checks_omitted': return `Repository checks omitted: ${divergence.reason}.`;
    case 'missing_commit': return `Checkpoint commit ${divergence.recordedCommit} is missing.`;
    case 'outside_history': return `Checkpoint commit ${divergence.recordedCommit} is outside current history at ${divergence.currentCommit ?? 'no commit'}.`;
    case 'pending_changes': return 'Working tree has uncommitted changes.';
    case 'branch_changed': return `Branch changed from ${divergence.recordedBranch} to ${divergence.currentBranch ?? 'no branch'}.`;
  }
}

function validationLine(plan: TaskPlan): string {
  const step = findActiveStep(plan) ?? findLastCompletedStep(plan) ?? findNextStep(plan);
  if (step?.validationCommand) return `Before any edit, run \`${step.validationCommand}\` to validate step ${String(step.id)}. If it fails, correct the inherited state first.`;
  return 'Before any edit, record and run a validation command for the active or last completed step; correct inherited state if it fails.';
}

function nextStep(plan: TaskPlan, current: PlanStep | null): PlanStep | null {
  if (current === null) return null;
  return plan.steps.slice(plan.steps.indexOf(current) + 1).find((step) => step.status !== 'COMPLETED') ?? null;
}

function compose(input: BootSummaryInput, lists: OptionalLists): string {
  const active = findActiveStep(input.plan) ?? findNextStep(input.plan);
  const next = nextStep(input.plan, active);
  const lines = [
    `[ContextBrake boot v${BOOT_SUMMARY_VERSION}]`,
    `Task: ${input.plan.title} (${input.plan.taskId})`,
    `Current step: ${stepLabel(active)}`,
    `Next step: ${stepLabel(next)}`,
    '', ...listSection('Constraints', input.checkpoint.workingMemory.discoveredConstraints),
    '', ...listSection('Decisions', lists.decisions),
    '', ...listSection('Blocked items', input.checkpoint.workingMemory.blockedItems),
    '', ...listSection('Breaking changes', input.checkpoint.workingMemory.breakingChanges),
    '', ...listSection('Modified files', lists.modifiedFiles),
    '', ...listSection('Repository state', input.git.divergences.map(divergenceLine)),
    '', `## Validate first`, validationLine(input.plan),
  ];
  if (lists.reduced) lines.push('', `Full checkpoint: ${input.checkpointFile}`);
  return lines.join('\n');
}

function fitsBudget(text: string, maxTokens: number): boolean {
  return new TextEncoder().encode(text).length <= maxTokens;
}

export function renderBootSummary(input: BootSummaryInput): string {
  let modifiedFiles = [...input.checkpoint.modifiedFiles];
  let decisions = [...input.checkpoint.workingMemory.decisionsMade];
  let reduced = false;
  let summary = compose(input, { modifiedFiles, decisions, reduced });
  while (!fitsBudget(summary, input.maxTokens) && modifiedFiles.length > 0) {
    modifiedFiles = modifiedFiles.slice(0, -1);
    reduced = true;
    summary = compose(input, { modifiedFiles, decisions, reduced });
  }
  while (!fitsBudget(summary, input.maxTokens) && decisions.length > 0) {
    decisions = decisions.slice(1);
    reduced = true;
    summary = compose(input, { modifiedFiles, decisions, reduced });
  }
  return summary;
}

export function renderBootOmission(): string {
  return `[ContextBrake boot v${BOOT_SUMMARY_VERSION}] Boot omitted: the internal deadline elapsed. Validate the plan and checkpoint state before continuing.`;
}
