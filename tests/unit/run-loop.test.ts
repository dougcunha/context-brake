import { describe, expect, it } from 'vitest';
import { runPlan } from '../../src/core/services/run-loop.js';
import { runContext } from '../helpers/run-fakes.js';
import { planWithStatuses, stepStatuses } from '../helpers/run-plans.js';
import { completingSession, failing, passing, RunWorld } from '../helpers/run-world.js';

function threeStepWorld(): RunWorld {
  const world = new RunWorld(planWithStatuses(['PENDING', 'PENDING', 'PENDING'], null));
  world.sessions = [completingSession('s-1'), completingSession('s-2'), completingSession('s-3')];
  world.validations = [passing(), passing(), passing()];
  return world;
}

describe('complete run (RF1, RF6, CA-01, TC-01)', () => {
  it('completes a 3-step plan in 3 sessions with the stop completed', async () => {
    const world = threeStepWorld();
    const result = await runPlan(runContext(world));
    expect(result).toMatchObject({ runId: 'run-1', status: 'completed', stopReason: 'completed', limit: null });
    expect(world.plan === null ? [] : stepStatuses(world.plan)).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED']);
    expect(result.sessions.map((line) => [line.index, line.stepId, line.endReason, line.validation.status])).toEqual([[1, 1, 'reset_signal', 'passed'], [2, 2, 'reset_signal', 'passed'], [3, 3, 'reset_signal', 'passed']]);
    expect(world.snapshots).toBe(3);
    expect(world.lines).toEqual(result.sessions);
  });
  it('approves every listed command once before the first session and records the hashes (RF14)', async () => {
    const world = threeStepWorld();
    await runPlan(runContext(world));
    expect(world.commandRequests).toHaveLength(1);
    expect(world.commandRequests[0]?.map((command) => command.stepId)).toEqual([1, 2, 3]);
    expect(world.approvals.approved.map((entry) => entry.stepId)).toEqual([1, 2, 3]);
  });
  it('writes a running record with the session key, then a completed record with counters (DEC-14)', async () => {
    const world = threeStepWorld();
    await runPlan(runContext(world));
    expect(world.records.some((record) => record.activeSession?.sessionId === 's-1')).toBe(true);
    expect(world.records.at(-1)).toMatchObject({ status: 'completed', stopReason: 'completed', activeSession: null, counters: { sessions: 3, stepsCompleted: 3, tokens: { value: 3_000, source: 'measured' } } });
  });
  it('names the step, session number, and ceiling in each prompt', async () => {
    const world = threeStepWorld();
    await runPlan(runContext(world, { maxSessions: 5 }));
    expect(world.launches.map((launch) => launch.command.stdin.slice(0, 70))).toEqual([1, 2, 3].map((n) => `ContextBrake runner session ${n} of at most 5. Work only on step ${n}: Step ${n}.`.slice(0, 70)));
  });
});

describe('empty plan (DEC-21)', () => {
  it('completes without opening a session', async () => {
    const world = new RunWorld(planWithStatuses([], null));
    expect(await runPlan(runContext(world))).toMatchObject({ stopReason: 'completed', sessions: [], decisionStepId: null });
    expect(world.launches).toHaveLength(0);
  });
});

describe('validation failure feedback (RF4, CA-02, TC-02)', () => {
  it('keeps the step and gives the next session the failure clause and tail', async () => {
    const world = new RunWorld(planWithStatuses(['IN_PROGRESS', 'PENDING'], 1));
    world.sessions = [completingSession('s-1'), completingSession('s-2'), completingSession('s-3')];
    world.validations = [failing('expected 1 to be 2'), passing(), passing()];
    const result = await runPlan(runContext(world));
    expect(result.sessions.map((line) => line.stepId)).toEqual([1, 1, 2]);
    expect(result.sessions[0]?.statusCorrections).toEqual([{ stepId: 1, from: 'COMPLETED', to: 'IN_PROGRESS' }]);
    expect(world.launches[1]?.command.stdin).toContain('The last validation of this step failed (exit 1). Output tail:\nexpected 1 to be 2\n');
    expect(world.launches[2]?.command.stdin).not.toContain('The last validation');
  });
});

describe('run limits in the loop (RF7, CA-05, TC-05)', () => {
  it('opens no session after maxSessions and names the limit', async () => {
    const world = threeStepWorld();
    const result = await runPlan(runContext(world, { maxSessions: 2 }));
    expect(result).toMatchObject({ status: 'stopped', stopReason: 'limit_reached', limit: 'maxSessions' });
    expect(world.launches).toHaveLength(2);
  });
  it('stops with maxTotalMinutes after a session reaches the run deadline', async () => {
    const world = threeStepWorld();
    world.sessions = [{ hang: true, agent: (current) => completingSession('s-1').agent?.(current) }];
    const result = await runPlan(runContext(world, { maxTotalMinutes: 5, maxSessionMinutes: 5 }));
    expect(result).toMatchObject({ stopReason: 'limit_reached', limit: 'maxTotalMinutes' });
    expect(result.sessions.map((line) => line.endReason)).toEqual(['run_timeout']);
    expect(world.launches).toHaveLength(1);
  });
});

describe('resume link (RF13, DEC-12)', () => {
  it.each([['stopped', 'prev-1'], ['completed', null]] as const)('links a previous %s run as %s', async (status, expected) => {
    const world = threeStepWorld();
    world.previousRun = { ...threeStepWorldRecord(), status };
    await runPlan(runContext(world));
    expect(world.records[0]?.resumedFrom).toBe(expected);
    expect(world.pruned).toBe(1);
  });
});

function threeStepWorldRecord(): NonNullable<RunWorld['previousRun']> {
  return { v: 1, runId: 'prev-1', harness: 'claude-code', status: 'stopped', stopReason: 'limit_reached', limit: 'maxSessions', startedAt: '2026-09-22T10:00:00.000Z', endedAt: '2026-09-22T11:00:00.000Z', resumedFrom: null, activeSession: null, counters: { sessions: 1, stepsCompleted: 0, consecutiveFailures: 0, tokens: { value: 0, source: 'estimated' } } };
}
