import { describe, expect, it } from 'vitest';
import { RUNNER_DEFAULTS, type RunnerConfiguration } from '../../src/core/contracts/runner-configuration.js';
import { decideBeforeSession, exceededRunLimit, NO_FAILURES, recordValidation, runLimitForEnd, sessionDeadline, sessionLimitEnd, type FailureStreak, type RunUsage } from '../../src/core/services/run-limits.js';
import { planWithStatuses } from '../helpers/run-plans.js';

const limits: RunnerConfiguration = { ...RUNNER_DEFAULTS, maxSessions: 5, maxTotalMinutes: 60, maxSessionMinutes: 30, maxTotalTokens: 1_000 };
const idle: RunUsage = { sessions: 0, elapsedMs: 0, tokens: 0 };
const minute = 60_000;

function streakAfter(results: readonly [number, boolean][]): FailureStreak {
  return results.reduce((streak, [stepId, passed]) => recordValidation(streak, { stepId, passed }), NO_FAILURES);
}

describe('anti-loop with maxConsecutiveFailures 2 (RF8, TC-04)', () => {
  it('stops after two consecutive failures of the same step', () => {
    const failures = streakAfter([[1, false], [1, false]]);
    expect(decideBeforeSession({ plan: planWithStatuses(['IN_PROGRESS']), usage: idle, failures }, { ...limits, maxConsecutiveFailures: 2 })).toEqual({ kind: 'stop', reason: 'repeated_failure', limit: null });
  });
  it('does not stop for a failure, a pass, then a failure on another step', () => {
    const failures = streakAfter([[1, false], [1, true], [2, false]]);
    expect(failures).toEqual({ stepId: 2, count: 1 });
    expect(decideBeforeSession({ plan: planWithStatuses(['COMPLETED', 'IN_PROGRESS']), usage: idle, failures }, limits)).toEqual({ kind: 'continue' });
  });
  it('restarts the count when a different step fails', () => expect(streakAfter([[1, false], [2, false]])).toEqual({ stepId: 2, count: 1 }));
  it('does not stop after one failure', () => {
    expect(decideBeforeSession({ plan: planWithStatuses(['IN_PROGRESS']), usage: idle, failures: streakAfter([[1, false]]) }, limits)).toEqual({ kind: 'continue' });
  });
});

describe('pre-session limits (RF7, DEC-09, TC-05)', () => {
  it('opens the fifth session with maxSessions 5', () => expect(exceededRunLimit({ ...idle, sessions: 4 }, limits)).toBeNull());
  it('refuses a sixth session with maxSessions 5 and names the limit', () => {
    expect(decideBeforeSession({ plan: planWithStatuses(['PENDING']), usage: { ...idle, sessions: 5 }, failures: NO_FAILURES }, limits)).toEqual({ kind: 'stop', reason: 'limit_reached', limit: 'maxSessions' });
  });
  it('stops when the elapsed time reaches the total ceiling', () => {
    expect(exceededRunLimit({ ...idle, elapsedMs: 60 * minute - 1 }, limits)).toBeNull();
    expect(exceededRunLimit({ ...idle, elapsedMs: 60 * minute }, limits)).toBe('maxTotalMinutes');
  });
  it('stops when the token total reaches the ceiling', () => {
    expect(exceededRunLimit({ ...idle, tokens: 999 }, limits)).toBeNull();
    expect(exceededRunLimit({ ...idle, tokens: 1_000 }, limits)).toBe('maxTotalTokens');
  });
  it('reports completed, not a limit, when the last step is complete', () => {
    const usage = { sessions: 5, elapsedMs: 60 * minute, tokens: 1_000 };
    expect(decideBeforeSession({ plan: planWithStatuses(['COMPLETED', 'COMPLETED']), usage, failures: streakAfter([[2, false], [2, false]]) }, limits)).toEqual({ kind: 'stop', reason: 'completed', limit: null });
  });
});

describe('in-session deadline and tokens (RF7, DEC-09, TC-05)', () => {
  const runStartedAt = new Date('2026-09-23T10:00:00.000Z');
  it('uses the per-session ceiling early in the run', () => {
    expect(sessionDeadline({ runStartedAt, sessionStartedAt: runStartedAt }, limits)).toEqual({ at: new Date('2026-09-23T10:30:00.000Z'), limit: 'maxSessionMinutes' });
  });
  it('uses the total deadline when it comes first', () => {
    const sessionStartedAt = new Date('2026-09-23T10:45:00.000Z');
    expect(sessionDeadline({ runStartedAt, sessionStartedAt }, limits)).toEqual({ at: new Date('2026-09-23T11:00:00.000Z'), limit: 'maxTotalMinutes' });
  });
  it('ends the session as run_timeout at the total deadline and maps it to maxTotalMinutes', () => {
    const deadline = sessionDeadline({ runStartedAt, sessionStartedAt: new Date('2026-09-23T10:45:00.000Z') }, limits);
    expect(sessionLimitEnd({ now: new Date('2026-09-23T10:59:59.999Z'), deadline, tokens: 0 }, limits)).toBeNull();
    const end = sessionLimitEnd({ now: new Date('2026-09-23T11:00:00.000Z'), deadline, tokens: 0 }, limits);
    expect(end).toBe('run_timeout');
    expect(runLimitForEnd('run_timeout')).toBe('maxTotalMinutes');
  });
  it('ends the session as session_timeout at the per-session deadline without a run limit', () => {
    const deadline = sessionDeadline({ runStartedAt, sessionStartedAt: runStartedAt }, limits);
    expect(sessionLimitEnd({ now: deadline.at, deadline, tokens: 0 }, limits)).toBe('session_timeout');
    expect(runLimitForEnd('session_timeout')).toBeNull();
  });
  it('ends the session as token_limit when the run total crosses the ceiling and maps it to maxTotalTokens', () => {
    const deadline = sessionDeadline({ runStartedAt, sessionStartedAt: runStartedAt }, limits);
    expect(sessionLimitEnd({ now: runStartedAt, deadline, tokens: 1_000 }, limits)).toBe('token_limit');
    expect(runLimitForEnd('token_limit')).toBe('maxTotalTokens');
  });
  it.each(['reset_signal', 'harness_exit', 'harness_error', 'critical_ceiling', 'interrupted'] as const)('maps %s to no run limit', (endReason) => {
    expect(runLimitForEnd(endReason)).toBeNull();
  });
});
