import type { StateCheckpoint } from '../../src/core/contracts/state-checkpoint.js';
import type { PlanStepId, PlanStepStatus, TaskPlan } from '../../src/core/contracts/task-plan.js';

export function planWithStatuses(statuses: readonly PlanStepStatus[], currentStepId: number | null = 1): TaskPlan {
  const steps = statuses.map((status, index) => ({ id: index + 1, title: `Step ${index + 1}`, description: '', status, validationCommand: 'npm test', artifactsProduced: [] }));
  return { schemaVersion: 1, taskId: 'task', title: 'Task', currentStepId, steps };
}

export function checkpointAt(timestamp: string, activeStepId: PlanStepId | null = 1): StateCheckpoint {
  return {
    schemaVersion: 1, taskId: 'task', activeStepId, modifiedFiles: [], timestamp,
    gitState: { branch: 'main', lastCommitHash: null, cleanWorkingTree: null },
    workingMemory: { discoveredConstraints: [], decisionsMade: [], blockedItems: [], breakingChanges: [] },
  };
}

export function stepStatuses(plan: TaskPlan): PlanStepStatus[] {
  return plan.steps.map((step) => step.status);
}
