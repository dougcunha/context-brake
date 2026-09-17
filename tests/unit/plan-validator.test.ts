import { describe, expect, it } from 'vitest';
import { findActiveStep, findLastCompletedStep, findNextStep, isPlanComplete, PLAN_SCHEMA_VERSION, type TaskPlan } from '../../src/core/contracts/task-plan.js';
import { InvalidPlanError, parseTaskPlan, planIssues } from '../../src/core/validation/plan-validator.js';

function step(id: string | number, status: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, title: `step ${String(id)}`, status, ...extra };
}
function plan(steps: Record<string, unknown>[], extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { schemaVersion: PLAN_SCHEMA_VERSION, taskId: 'refactor-auth', title: 'Refactor auth', steps, ...extra };
}

describe('task plan contract (RF4, RF7, TC-03)', () => {
  it('parses a plan and applies field defaults', () => {
    const parsed: TaskPlan = parseTaskPlan(plan([step(1, 'IN_PROGRESS')], { currentStepId: 1 }));
    expect(parsed.steps[0]?.validationCommand).toBeNull();
    expect(parsed.steps[0]?.artifactsProduced).toEqual([]);
    expect(parsed.steps[0]?.description).toBe('');
  });
  it('accepts a step without a validation command (RF4 edge case)', () => {
    expect(planIssues(plan([step('a', 'PENDING')]))).toEqual([]);
  });
  it('accepts both string and numeric step identifiers', () => {
    expect(planIssues(plan([step('a', 'PENDING'), step(2, 'PENDING')]))).toEqual([]);
  });
});

describe('task plan consistency rules (RF7, CA-03)', () => {
  it('rejects two IN_PROGRESS steps (RF7, CA-03)', () => {
    const issues = planIssues(plan([step(1, 'IN_PROGRESS'), step(2, 'IN_PROGRESS')]));
    expect(issues.some((issue) => issue.rule === 'must not contain more than one IN_PROGRESS step')).toBe(true);
  });
  it('rejects duplicate step identifiers (RF7)', () => {
    const issues = planIssues(plan([step(1, 'PENDING'), step(1, 'PENDING')]));
    expect(issues.some((issue) => issue.rule === 'must not contain duplicate step identifiers')).toBe(true);
  });
  it('rejects a current step absent from steps (RF7)', () => {
    const issues = planIssues(plan([step(1, 'PENDING')], { currentStepId: 99 }));
    expect(issues).toContainEqual({ path: 'currentStepId', received: 99, rule: 'must reference a step present in steps' });
  });
  it('rejects an unknown status and unknown fields', () => {
    expect(planIssues(plan([step(1, 'ALMOST_DONE')]))).not.toEqual([]);
    expect(planIssues(plan([step(1, 'PENDING')], { extra: true }))).not.toEqual([]);
  });
  it('reports the field path and rule for every issue (RF7)', () => {
    for (const issue of planIssues(plan([step(1, 'ALMOST_DONE')]))) {
      expect(issue.path.length).toBeGreaterThan(0);
      expect(issue.rule.length).toBeGreaterThan(0);
    }
  });
});

describe('task plan schema version (RF8, CA-16, TC-16)', () => {
  it('names the required migration for another version', () => {
    const issues = planIssues({ ...plan([step(1, 'PENDING')]), schemaVersion: 2 });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe('schemaVersion');
    expect(issues[0]?.rule).toContain('migrate the file to schema version 1');
  });
  it('throws a dedicated error carrying the file path', () => {
    try {
      parseTaskPlan({ ...plan([step(1, 'PENDING')]), schemaVersion: 7 }, 'task_plan.json');
      expect.unreachable('expected InvalidPlanError');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidPlanError);
      expect((error as InvalidPlanError).filePath).toBe('task_plan.json');
    }
  });
});

describe('task plan step selection (RF9, RF15)', () => {
  const sample = parseTaskPlan(plan([step(1, 'COMPLETED'), step(2, 'IN_PROGRESS'), step(3, 'PENDING')]));
  it('finds the active step, the next step, and the last completed step', () => {
    expect(findActiveStep(sample)?.id).toBe(2);
    expect(findNextStep(sample)?.id).toBe(3);
    expect(findLastCompletedStep(sample)?.id).toBe(1);
  });
  it('falls back to the first pending step when none is active (RF9, RF15)', () => {
    const fresh = parseTaskPlan(plan([step(1, 'PENDING'), step(2, 'PENDING')]));
    expect(findActiveStep(fresh)).toBeNull();
    expect(findNextStep(fresh)?.id).toBe(1);
    expect(findLastCompletedStep(fresh)).toBeNull();
  });
  it('reports completion only when every step is complete (RF10, CA-06)', () => {
    expect(isPlanComplete(sample)).toBe(false);
    expect(isPlanComplete(parseTaskPlan(plan([step(1, 'COMPLETED')])))).toBe(true);
    expect(isPlanComplete(parseTaskPlan(plan([])))).toBe(false);
  });
});
