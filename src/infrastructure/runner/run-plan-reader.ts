import { resolve } from 'node:path';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { TaskPlan } from '../../core/contracts/task-plan.js';
import { assessPlan, type PlanReadiness } from '../../core/services/run-preflight.js';
import { assertCheckpointMatchesPlan, InvalidCheckpointError, parseStateCheckpoint } from '../../core/validation/checkpoint-validator.js';
import { InvalidPlanError } from '../../core/validation/plan-validator.js';
import { SYNTAX_RULE, type ValidationIssue } from '../../core/validation/issues.js';
import { readOptionalFile } from './runner-files.js';

export type PlanPreflight =
  | { readonly kind: 'missing_plan'; readonly file: string }
  | { readonly kind: 'invalid'; readonly file: string; readonly detail: string }
  | { readonly kind: 'ready'; readonly readiness: PlanReadiness };

type StateDocument = { readonly kind: 'missing' } | { readonly kind: 'syntax' } | { readonly kind: 'value'; readonly value: unknown };

export async function readPlanForRun(projectRoot: string, config: ContextBrakeConfig): Promise<PlanPreflight> {
  const { planFile, checkpointFile } = config.stateStorage;
  const plan = await readStateDocument(resolve(projectRoot, planFile));
  if (plan.kind === 'missing') return { kind: 'missing_plan', file: planFile };
  if (plan.kind === 'syntax') return { kind: 'invalid', file: planFile, detail: `(syntax) ${SYNTAX_RULE}` };
  let readiness: PlanReadiness;
  try {
    readiness = assessPlan(plan.value, planFile);
  } catch (error) {
    if (error instanceof InvalidPlanError) return { kind: 'invalid', file: planFile, detail: firstIssue(error.issues) };
    throw error;
  }
  if (readiness.kind === 'complete') return { kind: 'ready', readiness };
  const checkpointProblem = await checkpointIssue(resolve(projectRoot, checkpointFile), readiness.plan, config);
  if (checkpointProblem !== null) return { kind: 'invalid', file: checkpointFile, detail: checkpointProblem };
  return { kind: 'ready', readiness };
}

async function checkpointIssue(path: string, plan: TaskPlan, config: ContextBrakeConfig): Promise<string | null> {
  const { planFile, checkpointFile } = config.stateStorage;
  const document = await readStateDocument(path);
  if (document.kind === 'missing') return 'file is missing';
  if (document.kind === 'syntax') return `(syntax) ${SYNTAX_RULE}`;
  try {
    const checkpoint = parseStateCheckpoint(document.value, checkpointFile);
    assertCheckpointMatchesPlan(checkpoint, plan, checkpointFile);
    return checkpoint.taskId === plan.taskId ? null : `taskId must match ${planFile}`;
  } catch (error) {
    if (error instanceof InvalidCheckpointError) return firstIssue(error.issues);
    throw error;
  }
}

async function readStateDocument(path: string): Promise<StateDocument> {
  const source = await readOptionalFile(path);
  if (source === null) return { kind: 'missing' };
  try {
    return { kind: 'value', value: JSON.parse(source) as unknown };
  } catch {
    return { kind: 'syntax' };
  }
}

function firstIssue(issues: readonly ValidationIssue[]): string {
  const issue = issues[0];
  return issue === undefined ? 'validation failed' : `${issue.path} ${issue.rule}`;
}
