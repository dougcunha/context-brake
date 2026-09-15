import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod/mini';

const planStepSchema = z.looseObject({ id: z.union([z.string(), z.number()]), status: z.string(), validationCommand: z.optional(z.string()) });
const planSchema = z.looseObject({ currentStepId: z.optional(z.union([z.string(), z.number()])), steps: z.array(planStepSchema) });

type PlanStep = z.infer<typeof planStepSchema>;

export class NodePlanValidationReader {
  constructor(readonly projectRoot: string, readonly planFile: string) {}

  async readValidationCommand(): Promise<string | null> {
    const plan = await this.readPlan();
    if (plan === null) return null;
    return activeStep(plan.steps, plan.currentStepId)?.validationCommand ?? null;
  }

  private async readPlan(): Promise<z.infer<typeof planSchema> | null> {
    const content = await readFile(resolve(this.projectRoot, this.planFile), 'utf8').catch(() => null);
    if (content === null) return null;
    let value: unknown;
    try {
      value = JSON.parse(content) as unknown;
    } catch {
      return null;
    }
    const result = planSchema.safeParse(value);
    return result.success ? result.data : null;
  }
}
function activeStep(steps: readonly PlanStep[], currentStepId: string | number | undefined): PlanStep | null {
  if (currentStepId !== undefined) {
    const current = steps.find((step) => step.id === currentStepId);
    if (current) return current;
  }
  const inProgress = steps.find((step) => step.status === 'IN_PROGRESS');
  if (inProgress) return inProgress;
  return [...steps].reverse().find((step) => step.status === 'COMPLETED') ?? null;
}
