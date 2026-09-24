import { describe, expect, it } from 'vitest';
import { invalidStateFiles } from '../../src/core/services/run-lifecycle.js';
import { runPlan } from '../../src/core/services/run-loop.js';
import { runContext } from '../helpers/run-fakes.js';
import { checkpointAt, planWithStatuses } from '../helpers/run-plans.js';
import { completingSession, markActive, passing, RunWorld, signalEvents } from '../helpers/run-world.js';

function interruptedWorld(agent: (world: RunWorld) => void): RunWorld {
  const world = new RunWorld(planWithStatuses(['IN_PROGRESS', 'PENDING'], 1));
  world.sessions = [{ agent: (current) => { agent(current); current.interruptRequested = true; }, events: [{ kind: 'started', sessionId: 's-1' }], hang: true }];
  return world;
}

describe('interrupt handling (RF12, CA-09, DEC-12)', () => {
  it('stops the harness, restores an invalid plan from the snapshot, and records interrupted', async () => {
    const world = interruptedWorld((current) => { current.checkpoint = checkpointAt(current.now().toISOString()); current.plan = null; });
    const result = await runPlan(runContext(world));
    expect(result).toMatchObject({ status: 'interrupted', stopReason: 'interrupted' });
    expect(world.stops).toBe(1);
    expect(world.restored).toEqual([['plan']]);
    expect(world.records.at(-1)).toMatchObject({ status: 'interrupted', stopReason: 'interrupted' });
    expect(world.lines.map((line) => line.endReason)).toEqual(['interrupted']);
  });
  it('restores nothing when plan and checkpoint are still valid', async () => {
    const world = interruptedWorld((current) => { current.checkpoint = checkpointAt(current.now().toISOString()); });
    await runPlan(runContext(world));
    expect(world.restored).toEqual([]);
  });
});

describe('interrupt outside a session (RF12, DEC-12)', () => {
  it('stops a running validation and records the session without a validation result', async () => {
    const world = new RunWorld(planWithStatuses(['IN_PROGRESS', 'PENDING'], 1));
    world.sessions = [completingSession('s-1')];
    world.validations = ['interrupt'];
    const result = await runPlan(runContext(world));
    expect(result.stopReason).toBe('interrupted');
    expect(world.stops).toBe(1);
    expect(result.sessions[0]?.validation).toEqual({ status: 'not_run', exitCode: null, durationMs: null });
    expect(world.planWrites).toEqual([]);
  });
  it('stops before opening a session when the interrupt arrives between sessions', async () => {
    const world = new RunWorld(planWithStatuses(['IN_PROGRESS', 'PENDING'], 1));
    world.sessions = [completingSession('s-1')];
    world.validations = [passing()];
    world.afterSession = (current) => { current.interruptRequested = true; };
    const result = await runPlan(runContext(world));
    expect(result.stopReason).toBe('interrupted');
    expect(world.launches).toHaveLength(1);
    expect(world.restored).toEqual([]);
  });
  it('lists the invalid state files', () => {
    expect(invalidStateFiles({ plan: null, checkpoint: null })).toEqual(['plan', 'checkpoint']);
    expect(invalidStateFiles({ plan: planWithStatuses(['PENDING']), checkpoint: null })).toEqual(['checkpoint']);
  });
});

function removeFirst(current: RunWorld): void {
  if (current.plan === null) return;
  current.plan = { ...current.plan, currentStepId: 2, steps: current.plan.steps.filter((step) => step.id !== 1).map((step) => ({ ...step, status: 'IN_PROGRESS' as const })) };
}

describe('plan edits between sessions (DEC-07, errors section)', () => {
  it('stops with no_checkpoint without a record when the plan is invalid at start', async () => {
    const world = new RunWorld(null);
    expect(await runPlan(runContext(world))).toMatchObject({ runId: null, stopReason: 'no_checkpoint', sessions: [] });
    expect(world.records).toEqual([]);
  });
  it('skips validation when the agent removed the assigned step, then continues with the plan', async () => {
    const world = new RunWorld(planWithStatuses(['IN_PROGRESS', 'PENDING'], 1));
    world.sessions = [{ agent: removeFirst, events: signalEvents('s-1') }, completingSession('s-2')];
    world.validations = [passing()];
    const result = await runPlan(runContext(world));
    expect(result.sessions.map((line) => [line.stepId, line.validation.status])).toEqual([[1, 'not_run'], [2, 'passed']]);
    expect(result.stopReason).toBe('completed');
  });
  it('stops with no_checkpoint when the plan becomes invalid between sessions', async () => {
    const world = new RunWorld(planWithStatuses(['IN_PROGRESS', 'PENDING'], 1));
    world.sessions = [{ agent: (current) => { markActive('COMPLETED')(current); }, events: signalEvents('s-1') }];
    world.validations = [passing()];
    world.afterSession = (current) => { current.plan = null; };
    expect((await runPlan(runContext(world))).stopReason).toBe('no_checkpoint');
  });
});
