import type { RunStateAccess, StateReading } from '../../core/contracts/run-control.js';
import type { StateCheckpoint } from '../../core/contracts/state-checkpoint.js';
import type { TaskPlan } from '../../core/contracts/task-plan.js';
import { InvalidCheckpointError } from '../../core/validation/checkpoint-validator.js';
import { InvalidPlanError } from '../../core/validation/plan-validator.js';
import { isMissingFileError } from '../runtime/runtime-paths.js';
import { NodeCheckpointStore } from '../storage/checkpoint-store.js';
import { NodePlanStore } from '../storage/plan-store.js';

export type StatePaths = { readonly plan: string; readonly checkpoint: string };

export class NodeRunStateAccess implements RunStateAccess {
  private readonly plans: NodePlanStore;
  private readonly checkpoints: NodeCheckpointStore;

  constructor(paths: StatePaths) {
    this.plans = new NodePlanStore(paths.plan);
    this.checkpoints = new NodeCheckpointStore(paths.checkpoint);
  }

  async read(): Promise<StateReading> {
    const plan: TaskPlan | null = await readOrNull(() => this.plans.read());
    const checkpoint: StateCheckpoint | null = await readOrNull(() => this.checkpoints.read());
    return { plan, checkpoint };
  }

  async writePlan(plan: TaskPlan): Promise<void> {
    await this.plans.write(plan);
  }
}

async function readOrNull<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof InvalidPlanError || error instanceof InvalidCheckpointError || isMissingFileError(error)) return null;
    throw error;
  }
}
