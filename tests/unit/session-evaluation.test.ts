import { describe, expect, it } from 'vitest';
import { decideSessionGate, isCheckpointFresh, reconcilePlan } from '../../src/core/services/session-evaluation.js';
import { checkpointAt as checkpoint, planWithStatuses as plan, stepStatuses as statuses } from '../helpers/run-plans.js';

const sessionStartedAt = new Date('2026-09-23T10:00:00.000Z');

describe('checkpoint freshness and the no-checkpoint stop (RF9, DEC-07, TC-06)', () => {
  const current = plan(['IN_PROGRESS', 'PENDING']);
  it('treats a checkpoint written at the session start as fresh', () => expect(isCheckpointFresh(checkpoint('2026-09-23T10:00:00.000Z'), current, sessionStartedAt)).toBe(true));
  it('treats a checkpoint written before the session start as stale', () => expect(isCheckpointFresh(checkpoint('2026-09-23T09:59:59.999Z'), current, sessionStartedAt)).toBe(false));
  it('treats a checkpoint whose active step is not in the plan as not fresh', () => expect(isCheckpointFresh(checkpoint('2026-09-23T10:05:00.000Z', 9), current, sessionStartedAt)).toBe(false));
  it('stops with no_checkpoint when the harness exits with a stale checkpoint', () => {
    expect(decideSessionGate({ endReason: 'harness_exit', sessionStartedAt, stepId: 1, plan: current, checkpoint: checkpoint('2026-09-23T09:00:00.000Z') })).toEqual({ kind: 'no_checkpoint' });
  });
  it('stops with no_checkpoint when the checkpoint is invalid or missing', () => {
    expect(decideSessionGate({ endReason: 'session_timeout', sessionStartedAt, stepId: 1, plan: current, checkpoint: null })).toEqual({ kind: 'no_checkpoint' });
  });
  it('stops with no_checkpoint when the plan is invalid, even after the reset signal', () => {
    expect(decideSessionGate({ endReason: 'reset_signal', sessionStartedAt, stepId: 1, plan: null, checkpoint: checkpoint('2026-09-23T10:05:00.000Z') })).toEqual({ kind: 'no_checkpoint' });
  });
  it('validates after the reset signal without requiring a fresh checkpoint', () => {
    expect(decideSessionGate({ endReason: 'reset_signal', sessionStartedAt, stepId: 1, plan: current, checkpoint: null })).toEqual({ kind: 'validate' });
  });
  it('validates after a harness exit with a fresh checkpoint', () => {
    expect(decideSessionGate({ endReason: 'harness_exit', sessionStartedAt, stepId: 1, plan: current, checkpoint: checkpoint('2026-09-23T10:05:00.000Z') })).toEqual({ kind: 'validate' });
  });
  it('reports a removed assigned step instead of validating it', () => {
    expect(decideSessionGate({ endReason: 'reset_signal', sessionStartedAt, stepId: 7, plan: current, checkpoint: null })).toEqual({ kind: 'step_removed' });
  });
});

describe('plan reconciliation on a pass (RF4, DEC-07, TC-02)', () => {
  it('completes the assigned step and activates the next open step', () => {
    const result = reconcilePlan({ before: plan(['IN_PROGRESS', 'PENDING', 'PENDING']), after: plan(['IN_PROGRESS', 'PENDING', 'PENDING']), stepId: 1, passed: true });
    expect(statuses(result.plan)).toEqual(['COMPLETED', 'IN_PROGRESS', 'PENDING']);
    expect(result.plan.currentStepId).toBe(2);
    expect(result.statusCorrections).toEqual([]);
    expect(result.changed).toBe(true);
  });
  it('keeps a completion the agent wrote for the validated step without a correction', () => {
    const result = reconcilePlan({ before: plan(['IN_PROGRESS', 'PENDING']), after: plan(['COMPLETED', 'PENDING']), stepId: 1, passed: true });
    expect(statuses(result.plan)).toEqual(['COMPLETED', 'IN_PROGRESS']);
    expect(result.statusCorrections).toEqual([]);
  });
  it('clears the current step when the last step passes', () => {
    const result = reconcilePlan({ before: plan(['COMPLETED', 'IN_PROGRESS'], 2), after: plan(['COMPLETED', 'IN_PROGRESS'], 2), stepId: 2, passed: true });
    expect(statuses(result.plan)).toEqual(['COMPLETED', 'COMPLETED']);
    expect(result.plan.currentStepId).toBeNull();
  });
  it('returns to an earlier open step when no later step is open', () => {
    const result = reconcilePlan({ before: plan(['PENDING', 'IN_PROGRESS'], 2), after: plan(['PENDING', 'IN_PROGRESS'], 2), stepId: 2, passed: true });
    expect(statuses(result.plan)).toEqual(['IN_PROGRESS', 'COMPLETED']);
    expect(result.plan.currentStepId).toBe(1);
  });
  it('does not mutate the plans it receives', () => {
    const after = plan(['COMPLETED', 'COMPLETED']);
    const snapshot = JSON.stringify(after);
    reconcilePlan({ before: plan(['IN_PROGRESS', 'PENDING']), after, stepId: 1, passed: false });
    expect(JSON.stringify(after)).toBe(snapshot);
  });
});
