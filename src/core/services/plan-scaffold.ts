import { CHECKPOINT_SCHEMA_VERSION, type StateCheckpoint } from '../contracts/state-checkpoint.js';
import { PLAN_SCHEMA_VERSION, type TaskPlan } from '../contracts/task-plan.js';

export const EXAMPLE_STEP_ID = 1;
const EXAMPLE_STEP_TITLE = 'Describe the first step';
const EXAMPLE_STEP_DESCRIPTION = 'Replace this example with the first real step of the task.';
const EXAMPLE_VALIDATION_COMMAND = 'npm test';

export type ScaffoldInput = {
  readonly taskId: string;
  readonly now: Date;
};

export function buildInitialPlan(input: ScaffoldInput): TaskPlan {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    taskId: input.taskId,
    title: input.taskId,
    currentStepId: EXAMPLE_STEP_ID,
    steps: [
      {
        id: EXAMPLE_STEP_ID,
        title: EXAMPLE_STEP_TITLE,
        description: EXAMPLE_STEP_DESCRIPTION,
        status: 'PENDING',
        validationCommand: EXAMPLE_VALIDATION_COMMAND,
        artifactsProduced: [],
      },
    ],
  };
}

export function buildInitialCheckpoint(input: ScaffoldInput): StateCheckpoint {
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    taskId: input.taskId,
    activeStepId: EXAMPLE_STEP_ID,
    gitState: { branch: null, lastCommitHash: null, cleanWorkingTree: null },
    workingMemory: { discoveredConstraints: [], decisionsMade: [], blockedItems: [], breakingChanges: [] },
    modifiedFiles: [],
    timestamp: input.now.toISOString(),
  };
}
