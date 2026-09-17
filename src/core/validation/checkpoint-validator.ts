import { CHECKPOINT_SCHEMA_VERSION, stateCheckpointSchema, type StateCheckpoint } from '../contracts/state-checkpoint.js';
import type { TaskPlan } from '../contracts/task-plan.js';
import { syntaxIssue, toIssues, versionMismatchIssue, type ValidationIssue } from './issues.js';

const ACTIVE_STEP_RULE = 'must reference a step present in the plan';

export class InvalidCheckpointError extends Error {
  constructor(readonly issues: ValidationIssue[], readonly filePath?: string, options?: ErrorOptions) {
    super('State checkpoint validation failed.', options);
    this.name = 'InvalidCheckpointError';
  }
}

export function parseStateCheckpoint(input: unknown, filePath?: string): StateCheckpoint {
  const mismatch = versionMismatchIssue(input, CHECKPOINT_SCHEMA_VERSION);
  if (mismatch !== null) throw new InvalidCheckpointError([mismatch], filePath);
  const result = stateCheckpointSchema.safeParse(input);
  if (result.success) return result.data;
  throw new InvalidCheckpointError(toIssues(result.error.issues, input), filePath);
}

export function invalidCheckpointSyntaxError(filePath: string, received: string, cause: unknown): InvalidCheckpointError {
  return new InvalidCheckpointError([syntaxIssue(received)], filePath, { cause });
}

export function checkpointAgainstPlanIssues(checkpoint: StateCheckpoint, plan: TaskPlan): ValidationIssue[] {
  if (checkpoint.activeStepId === null) return [];
  if (plan.steps.some((step) => step.id === checkpoint.activeStepId)) return [];
  return [{ path: 'activeStepId', received: checkpoint.activeStepId, rule: ACTIVE_STEP_RULE }];
}

export function assertCheckpointMatchesPlan(checkpoint: StateCheckpoint, plan: TaskPlan, filePath?: string): void {
  const issues = checkpointAgainstPlanIssues(checkpoint, plan);
  if (issues.length > 0) throw new InvalidCheckpointError(issues, filePath);
}

export function checkpointIssues(input: unknown, filePath?: string): ValidationIssue[] {
  try {
    parseStateCheckpoint(input, filePath);
  } catch (error) {
    if (error instanceof InvalidCheckpointError) return error.issues;
    throw error;
  }
  return [];
}
