import { z } from 'zod/mini';

export const PLAN_SCHEMA_VERSION = 1;
export const PLAN_STEP_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'] as const;
export type PlanStepStatus = (typeof PLAN_STEP_STATUSES)[number];

const DUPLICATE_STEP_IDS_RULE = 'must not contain duplicate step identifiers';
const SINGLE_IN_PROGRESS_RULE = 'must not contain more than one IN_PROGRESS step';
const CURRENT_STEP_RULE = 'must reference a step present in steps';

type CustomIssue = { code: 'custom'; path: PropertyKey[]; input: unknown; message: string };

export const stepIdSchema = z.union([z.string().check(z.minLength(1)), z.int()]);
const nonEmptyText = z.string().check(z.minLength(1));

export const planStepSchema = z.strictObject({
  id: stepIdSchema,
  title: nonEmptyText,
  description: z._default(z.string(), ''),
  status: z.enum(PLAN_STEP_STATUSES),
  validationCommand: z._default(z.nullable(z.string()), null),
  artifactsProduced: z._default(z.array(z.string()), []),
});

export type PlanStep = z.infer<typeof planStepSchema>;
export type PlanStepId = z.infer<typeof stepIdSchema>;

function addIssue(ctx: z.core.ParsePayload, issue: CustomIssue): void {
  ctx.issues.push(issue);
}
function hasDuplicateIds(steps: readonly PlanStep[]): boolean {
  return new Set(steps.map((step) => String(step.id))).size !== steps.length;
}
function inProgressCount(steps: readonly PlanStep[]): number {
  return steps.filter((step) => step.status === 'IN_PROGRESS').length;
}
function hasStep(steps: readonly PlanStep[], id: PlanStepId): boolean {
  return steps.some((step) => step.id === id);
}

export const taskPlanSchema = z.strictObject({
  $schema: z.optional(z.string()),
  schemaVersion: z.literal(PLAN_SCHEMA_VERSION),
  taskId: nonEmptyText,
  title: nonEmptyText,
  currentStepId: z._default(z.nullable(stepIdSchema), null),
  steps: z.array(planStepSchema),
}).check((ctx) => {
  const plan = ctx.value;
  if (hasDuplicateIds(plan.steps)) addIssue(ctx, { code: 'custom', path: ['steps'], input: plan.steps, message: DUPLICATE_STEP_IDS_RULE });
  if (inProgressCount(plan.steps) > 1) addIssue(ctx, { code: 'custom', path: ['steps'], input: plan.steps, message: SINGLE_IN_PROGRESS_RULE });
  if (plan.currentStepId !== null && !hasStep(plan.steps, plan.currentStepId)) {
    addIssue(ctx, { code: 'custom', path: ['currentStepId'], input: plan.currentStepId, message: CURRENT_STEP_RULE });
  }
});

export type TaskPlan = z.infer<typeof taskPlanSchema>;

export interface PlanStore {
  read(): Promise<TaskPlan>;
  write(plan: TaskPlan): Promise<void>;
  exists(): Promise<boolean>;
}

export function isPlanComplete(plan: TaskPlan): boolean {
  return plan.steps.length > 0 && plan.steps.every((step) => step.status === 'COMPLETED');
}

export function findActiveStep(plan: TaskPlan): PlanStep | null {
  if (plan.currentStepId !== null) {
    const current = plan.steps.find((step) => step.id === plan.currentStepId);
    if (current) return current;
  }
  return plan.steps.find((step) => step.status === 'IN_PROGRESS') ?? null;
}

export function findLastCompletedStep(plan: TaskPlan): PlanStep | null {
  return [...plan.steps].reverse().find((step) => step.status === 'COMPLETED') ?? null;
}

export function findNextStep(plan: TaskPlan): PlanStep | null {
  const active = findActiveStep(plan);
  if (active === null) return plan.steps.find((step) => step.status === 'PENDING') ?? null;
  const index = plan.steps.indexOf(active);
  return plan.steps.slice(index + 1).find((step) => step.status !== 'COMPLETED') ?? null;
}
