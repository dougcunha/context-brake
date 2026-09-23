import { describe, expect, it } from 'vitest';
import type { GitInspector, GitState } from '../../src/core/contracts/git.js';
import type { CheckpointStore, StateCheckpoint } from '../../src/core/contracts/state-checkpoint.js';
import type { PlanStore, TaskPlan } from '../../src/core/contracts/task-plan.js';
import { buildPlanStatusReport } from '../../src/core/services/plan-status.js';
import { InvalidPlanError } from '../../src/core/validation/plan-validator.js';

function makePlan(stepsCount = 5, completedCount = 2): TaskPlan {
  const steps = Array.from({ length: stepsCount }, (_, i) => ({
    id: `step-${i + 1}`,
    title: `Step ${i + 1}`,
    description: '',
    status: (i < completedCount ? 'COMPLETED' : i === completedCount ? 'IN_PROGRESS' : 'PENDING') as TaskPlan['steps'][number]['status'],
    validationCommand: null,
    artifactsProduced: [],
  }));
  return { schemaVersion: 1, taskId: 'task-auth', title: 'Task Auth', currentStepId: `step-${completedCount + 1}`, steps };
}

function makeCheckpoint(): StateCheckpoint {
  return {
    schemaVersion: 1, taskId: 'task-auth', activeStepId: 'step-3',
    gitState: { branch: 'main', lastCommitHash: 'abc1234', cleanWorkingTree: true },
    workingMemory: { discoveredConstraints: ['c1', 'c2'], decisionsMade: ['d1'], blockedItems: [], breakingChanges: [] },
    modifiedFiles: [], timestamp: '2026-09-21T15:00:00.000Z',
  };
}

function mockStore<T>(exists: boolean, item?: T, error?: Error) {
  return {
    exists: async () => exists,
    read: async () => {
      if (error) throw error;
      return item!;
    },
    write: async () => {},
  };
}

describe('buildPlanStatusReport: healthy and missing states', () => {
  it('builds healthy report with 5 steps, 2 completed, active step, and counts', async () => {
    const planStore = mockStore(true, makePlan(5, 2)) as PlanStore;
    const checkpointStore = mockStore(true, makeCheckpoint()) as CheckpointStore;
    const report = await buildPlanStatusReport({ planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', planStore, checkpointStore });
    expect(report.status).toBe('healthy');
    expect(report.exitCode).toBe(0);
    expect(report.plan?.steps).toHaveLength(5);
    expect(report.plan?.activeStep?.id).toBe('step-3');
    expect(report.checkpoint?.constraintsCount).toBe(2);
    expect(report.checkpoint?.decisionsCount).toBe(1);
    expect(report.files.plan.valid).toBe(true);
    expect(report.files.checkpoint.valid).toBe(true);
  });

  it('handles missing plan gracefully without error findings', async () => {
    const planStore = mockStore(false) as PlanStore;
    const checkpointStore = mockStore(false) as CheckpointStore;
    const report = await buildPlanStatusReport({ planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', planStore, checkpointStore });
    expect(report.plan).toBeNull();
    expect(report.checkpoint).toBeNull();
    expect(report.files.plan.exists).toBe(false);
    expect(report.files.plan.valid).toBe(false);
    expect(report.exitCode).toBe(0);
  });
});

describe('buildPlanStatusReport: error findings and git', () => {
  it('reports error findings and exit code 2 when plan has schema violations', async () => {
    const err = new InvalidPlanError([{ path: 'taskId', received: undefined, rule: 'is required' }]);
    const planStore = mockStore(true, undefined, err) as PlanStore;
    const checkpointStore = mockStore(true, makeCheckpoint()) as CheckpointStore;
    const report = await buildPlanStatusReport({ planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', planStore, checkpointStore });
    expect(report.status).toBe('errors');
    expect(report.exitCode).toBe(2);
    expect(report.files.plan.valid).toBe(false);
    expect(report.findings[0]?.message).toContain('taskId is required');
  });

  it('includes git status and divergence when inspector is provided', async () => {
    const gitState: GitState = { status: 'available', branch: 'main', headCommit: 'def5678', cleanWorkingTree: false, recordedCommit: 'outside_history' };
    const gitInspector: GitInspector = { inspect: async () => gitState };
    const report = await buildPlanStatusReport({
      planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json',
      planStore: mockStore(true, makePlan()) as PlanStore,
      checkpointStore: mockStore(true, makeCheckpoint()) as CheckpointStore,
      gitInspector,
    });
    expect(report.git?.status).toBe('available');
    expect(report.git?.divergences.some((d) => d.kind === 'pending_changes')).toBe(true);
  });
});

