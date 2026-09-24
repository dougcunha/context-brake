import { describe, expect, it } from 'vitest';
import { reconcilePlan } from '../../src/core/services/session-evaluation.js';
import { parseTaskPlan } from '../../src/core/validation/plan-validator.js';
import { planWithStatuses as plan, stepStatuses as statuses } from '../helpers/run-plans.js';

describe('status corrections (RF5, DEC-07, TC-03)', () => {
  it('reverts the assigned and a later step the agent completed when validation fails', () => {
    const result = reconcilePlan({ before: plan(['IN_PROGRESS', 'PENDING']), after: plan(['COMPLETED', 'COMPLETED']), stepId: 1, passed: false });
    expect(statuses(result.plan)).toEqual(['IN_PROGRESS', 'PENDING']);
    expect(result.plan.currentStepId).toBe(1);
    expect(result.statusCorrections).toEqual([{ stepId: 1, from: 'COMPLETED', to: 'IN_PROGRESS' }, { stepId: 2, from: 'COMPLETED', to: 'PENDING' }]);
  });
  it('reverts a FAILED status the agent wrote on the assigned step', () => {
    const result = reconcilePlan({ before: plan(['IN_PROGRESS', 'PENDING']), after: plan(['FAILED', 'PENDING']), stepId: 1, passed: false });
    expect(result.statusCorrections).toEqual([{ stepId: 1, from: 'FAILED', to: 'IN_PROGRESS' }]);
  });
  it('reverts a later step completed without a runner pass even when the assigned step passes', () => {
    const result = reconcilePlan({ before: plan(['IN_PROGRESS', 'PENDING', 'PENDING']), after: plan(['COMPLETED', 'COMPLETED', 'PENDING']), stepId: 1, passed: true });
    expect(statuses(result.plan)).toEqual(['COMPLETED', 'IN_PROGRESS', 'PENDING']);
    expect(result.statusCorrections).toEqual([{ stepId: 2, from: 'COMPLETED', to: 'PENDING' }]);
  });
  it('keeps steps that were already completed before the session', () => {
    const result = reconcilePlan({ before: plan(['COMPLETED', 'IN_PROGRESS'], 2), after: plan(['COMPLETED', 'IN_PROGRESS'], 2), stepId: 2, passed: false });
    expect(result.statusCorrections).toEqual([]);
    expect(result.changed).toBe(false);
  });
});

describe('steps the agent added during the session (RF5, DEC-07)', () => {
  it('reverts a new step the agent marked COMPLETED to PENDING', () => {
    const result = reconcilePlan({ before: plan(['IN_PROGRESS']), after: plan(['IN_PROGRESS', 'COMPLETED']), stepId: 1, passed: false });
    expect(result.statusCorrections).toEqual([{ stepId: 2, from: 'COMPLETED', to: 'PENDING' }]);
  });
});

describe('single active step after reconciliation (DEC-07, TC-03)', () => {
  it('releases a second IN_PROGRESS step so the plan keeps a single active step', () => {
    const result = reconcilePlan({ before: plan(['IN_PROGRESS', 'PENDING']), after: plan(['IN_PROGRESS', 'IN_PROGRESS']), stepId: 1, passed: false });
    expect(statuses(result.plan)).toEqual(['IN_PROGRESS', 'PENDING']);
    expect(result.statusCorrections).toEqual([{ stepId: 2, from: 'IN_PROGRESS', to: 'PENDING' }]);
  });
  it.each([true, false])('produces a plan the PRD-03 strict validator accepts (passed: %s)', (passed) => {
    const result = reconcilePlan({ before: plan(['IN_PROGRESS', 'PENDING', 'PENDING']), after: plan(['COMPLETED', 'IN_PROGRESS', 'COMPLETED'], 2), stepId: 1, passed });
    expect(parseTaskPlan(result.plan)).toEqual(result.plan);
  });
});
