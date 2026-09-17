import { PLAN_SCHEMA_VERSION, taskPlanSchema, type TaskPlan } from '../contracts/task-plan.js';
import { syntaxIssue, toIssues, versionMismatchIssue, type ValidationIssue } from './issues.js';

export class InvalidPlanError extends Error {
  constructor(readonly issues: ValidationIssue[], readonly filePath?: string, options?: ErrorOptions) {
    super('Task plan validation failed.', options);
    this.name = 'InvalidPlanError';
  }
}

export function parseTaskPlan(input: unknown, filePath?: string): TaskPlan {
  const mismatch = versionMismatchIssue(input, PLAN_SCHEMA_VERSION);
  if (mismatch !== null) throw new InvalidPlanError([mismatch], filePath);
  const result = taskPlanSchema.safeParse(input);
  if (result.success) return result.data;
  throw new InvalidPlanError(toIssues(result.error.issues, input), filePath);
}

export function invalidPlanSyntaxError(filePath: string, received: string, cause: unknown): InvalidPlanError {
  return new InvalidPlanError([syntaxIssue(received)], filePath, { cause });
}

export function planIssues(input: unknown, filePath?: string): ValidationIssue[] {
  try {
    parseTaskPlan(input, filePath);
  } catch (error) {
    if (error instanceof InvalidPlanError) return error.issues;
    throw error;
  }
  return [];
}
