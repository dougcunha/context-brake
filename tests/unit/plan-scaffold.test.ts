import { describe, expect, it } from 'vitest';
import { buildInitialCheckpoint, buildInitialPlan, EXAMPLE_STEP_ID } from '../../src/core/services/plan-scaffold.js';
import { assertCheckpointMatchesPlan, parseStateCheckpoint } from '../../src/core/validation/checkpoint-validator.js';
import { parseTaskPlan } from '../../src/core/validation/plan-validator.js';

const NOW = new Date('2026-09-17T10:00:00.000Z');
const TASK = 'refactor-auth';
const scaffold = { taskId: TASK, now: NOW };

describe('plan scaffold (RF1, RF3, CA-01)', () => {
  it('creates a plan with one example step carrying status and validation command', () => {
    const plan = buildInitialPlan(scaffold);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.status).toBe('PENDING');
    expect(plan.steps[0]?.validationCommand).not.toBeNull();
    expect(plan.steps[0]?.title.length).toBeGreaterThan(0);
    expect(plan.currentStepId).toBe(EXAMPLE_STEP_ID);
    expect(plan.taskId).toBe(TASK);
  });
  it('creates a checkpoint with empty working memory and no git state', () => {
    const checkpoint = buildInitialCheckpoint(scaffold);
    expect(checkpoint.activeStepId).toBe(EXAMPLE_STEP_ID);
    expect(checkpoint.gitState).toEqual({ branch: null, lastCommitHash: null, cleanWorkingTree: null });
    expect(checkpoint.workingMemory.discoveredConstraints).toEqual([]);
    expect(checkpoint.modifiedFiles).toEqual([]);
  });
  it('uses the injected clock rather than wall-clock time', () => {
    expect(buildInitialCheckpoint(scaffold).timestamp).toBe(NOW.toISOString());
  });
});

describe('scaffold output validity (RF1, RF7, CA-01)', () => {
  it('produces files that pass the strict validators', () => {
    const plan = parseTaskPlan(buildInitialPlan(scaffold));
    const checkpoint = parseStateCheckpoint(buildInitialCheckpoint(scaffold));
    expect(plan.steps).toHaveLength(1);
    expect(checkpoint.taskId).toBe(TASK);
  });
  it('produces a checkpoint whose active step exists in the plan', () => {
    const plan = parseTaskPlan(buildInitialPlan(scaffold));
    const checkpoint = parseStateCheckpoint(buildInitialCheckpoint(scaffold));
    expect(() => assertCheckpointMatchesPlan(checkpoint, plan)).not.toThrow();
  });
});
