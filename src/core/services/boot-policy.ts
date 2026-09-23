import type { GitComparison } from '../contracts/git.js';
import { isPlanComplete } from '../contracts/task-plan.js';
import { assertCheckpointMatchesPlan, InvalidCheckpointError, parseStateCheckpoint } from '../validation/checkpoint-validator.js';
import { InvalidPlanError, parseTaskPlan } from '../validation/plan-validator.js';
import type { ValidationIssue } from '../validation/issues.js';
import { renderBootSummary } from './boot-summary.js';

export type BootFileInput = { readonly kind: 'missing' } | { readonly kind: 'value'; readonly value: unknown } | { readonly kind: 'invalid'; readonly error: InvalidPlanError | InvalidCheckpointError };
export type BootPolicyInput = {
  readonly plan: BootFileInput;
  readonly checkpoint: BootFileInput;
  readonly planFile: string;
  readonly checkpointFile: string;
  readonly git: GitComparison;
  readonly maxTokens: number;
};
export type BootDecision = { readonly kind: 'boot'; readonly text: string } | { readonly kind: 'none' } | { readonly kind: 'invalid_state'; readonly text: string };

function issueInstruction(file: string, issues: readonly ValidationIssue[]): BootDecision {
  const issue = issues[0];
  const detail = issue === undefined ? 'validation failed' : `${issue.path}: ${issue.rule}`;
  return { kind: 'invalid_state', text: `[ContextBrake boot v1] Repair ${file}: ${detail}. Validate the file before continuing.` };
}

export function decideBoot(input: BootPolicyInput): BootDecision {
  if (input.plan.kind === 'missing') return { kind: 'none' };
  if (input.plan.kind === 'invalid') return issueInstruction(input.planFile, input.plan.error.issues);
  let plan;
  try {
    plan = parseTaskPlan(input.plan.value, input.planFile);
  } catch (error) {
    if (error instanceof InvalidPlanError) return issueInstruction(input.planFile, error.issues);
    throw error;
  }
  if (isPlanComplete(plan)) return { kind: 'none' };
  if (input.checkpoint.kind === 'missing') return { kind: 'invalid_state', text: `[ContextBrake boot v1] Repair ${input.checkpointFile}: file is missing. Validate the file before continuing.` };
  if (input.checkpoint.kind === 'invalid') return issueInstruction(input.checkpointFile, input.checkpoint.error.issues);
  try {
    const checkpoint = parseStateCheckpoint(input.checkpoint.value, input.checkpointFile);
    assertCheckpointMatchesPlan(checkpoint, plan, input.checkpointFile);
    if (checkpoint.taskId !== plan.taskId) return { kind: 'invalid_state', text: `[ContextBrake boot v1] Repair ${input.checkpointFile}: taskId must match ${input.planFile}. Validate the file before continuing.` };
    return { kind: 'boot', text: renderBootSummary({ plan, checkpoint, git: input.git, checkpointFile: input.checkpointFile, maxTokens: input.maxTokens }) };
  } catch (error) {
    if (error instanceof InvalidCheckpointError) return issueInstruction(input.checkpointFile, error.issues);
    throw error;
  }
}
