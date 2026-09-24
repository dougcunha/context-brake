import type { CommandForApproval } from './run-ports.js';
import type { RunSessionLine } from './run-records.js';
import type { StateCheckpoint } from './state-checkpoint.js';
import type { PlanStepId, TaskPlan } from './task-plan.js';

export interface Timer {
  wait(milliseconds: number): Promise<void>;
}

export interface InterruptSignal {
  isRequested(): boolean;
}

export type StateReading = { readonly plan: TaskPlan | null; readonly checkpoint: StateCheckpoint | null };
export interface RunStateAccess {
  read(): Promise<StateReading>;
  writePlan(plan: TaskPlan): Promise<void>;
}

export interface BootTokenEstimator {
  estimate(): Promise<number>;
}

export type RunProgressEvent =
  | { readonly kind: 'session_started'; readonly index: number; readonly stepId: PlanStepId; readonly stepTitle: string }
  | { readonly kind: 'session_finished'; readonly line: RunSessionLine; readonly stepTitle: string; readonly outputTail: string | null; readonly harnessDetail: string | null }
  | { readonly kind: 'commands_approved'; readonly commands: readonly CommandForApproval[] };
export interface RunProgressListener {
  onProgress(event: RunProgressEvent): void;
}
