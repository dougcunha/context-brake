import { readFile, realpath, stat } from 'node:fs/promises';
import type { PlanStore, TaskPlan } from '../../core/contracts/task-plan.js';
import { invalidPlanSyntaxError, parseTaskPlan } from '../../core/validation/plan-validator.js';
import { writeFileAtomically } from './atomic-writer.js';

export async function resolveWriteTarget(filePath: string): Promise<string> {
  return realpath(filePath).catch(() => filePath);
}

export function serializeStateDocument(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export class NodePlanStore implements PlanStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<TaskPlan> {
    const source = await readFile(this.filePath, 'utf8');
    let value: unknown;
    try {
      value = JSON.parse(source) as unknown;
    } catch (error) {
      throw invalidPlanSyntaxError(this.filePath, source, error);
    }
    return parseTaskPlan(value, this.filePath);
  }

  async write(plan: TaskPlan): Promise<void> {
    const target = await resolveWriteTarget(this.filePath);
    await writeFileAtomically(target, serializeStateDocument(plan));
  }

  async exists(): Promise<boolean> {
    return stat(this.filePath).then((entry) => entry.isFile()).catch(() => false);
  }
}
