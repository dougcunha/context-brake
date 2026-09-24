import { describe, expect, it } from 'vitest';
import { runPlan } from '../../src/core/services/run-loop.js';
import { runContext } from '../helpers/run-fakes.js';
import { planWithStatuses } from '../helpers/run-plans.js';
import { completingSession, failing, markActive, passing, RunWorld, signalEvents, type RunWorld as World } from '../helpers/run-world.js';

function world(sessions: World['sessions'], validations: World['validations']): RunWorld {
  const current = new RunWorld(planWithStatuses(['IN_PROGRESS', 'PENDING', 'PENDING'], 1));
  current.sessions = sessions;
  current.validations = validations;
  return current;
}
function editCommand(command: string | null): (current: RunWorld) => void {
  return (current) => {
    markActive('COMPLETED')(current);
    if (current.plan !== null) current.plan = { ...current.plan, steps: current.plan.steps.map((step) => (step.id === 1 ? { ...step, validationCommand: command } : step)) };
  };
}

describe('command confirmation (RF14, CA-10, TC-07)', () => {
  it('stops with confirmation_required before any session when the commands are declined', async () => {
    const current = world([completingSession('s-1')], [passing()]);
    current.commandAnswers = [false];
    const result = await runPlan(runContext(current));
    expect(result).toMatchObject({ runId: null, stopReason: 'confirmation_required', status: 'stopped' });
    expect(current.launches).toHaveLength(0);
    expect(current.records).toHaveLength(0);
  });
  it('re-lists a command changed mid-run and runs nothing when it is declined', async () => {
    const current = world([{ agent: editCommand('npm test -- --bail'), events: signalEvents('s-1') }], [passing()]);
    current.commandAnswers = [true, false];
    const result = await runPlan(runContext(current));
    expect(current.commandRequests[1]?.map((command) => command.command)).toEqual(['npm test -- --bail']);
    expect(result.stopReason).toBe('confirmation_required');
    expect(current.validationCommands).toEqual([]);
  });
  it('runs a changed command once it is approved', async () => {
    const current = world([{ agent: editCommand('npm test -- --bail'), events: signalEvents('s-1') }, { hang: true }], [passing()]);
    await runPlan(runContext(current, { maxSessions: 1 }));
    expect(current.validationCommands).toEqual(['npm test -- --bail']);
  });
  it('stops with no_checkpoint when the agent removed the step command', async () => {
    const current = world([{ agent: editCommand(null), events: signalEvents('s-1') }], []);
    expect((await runPlan(runContext(current))).stopReason).toBe('no_checkpoint');
  });
});

describe('step approval (RF11, CA-08, TC-09)', () => {
  it('asks after each validated step and stops with step_not_approved on a no', async () => {
    const current = world([completingSession('s-1'), completingSession('s-2'), completingSession('s-3')], [passing(), passing(), passing()]);
    current.stepAnswers = [true, false];
    const result = await runPlan(runContext(current));
    expect(current.stepRequests.map((step) => step.id)).toEqual([1, 2]);
    expect(result).toMatchObject({ stopReason: 'step_not_approved', decisionStepId: 2 });
    expect(current.launches).toHaveLength(2);
  });
  it('does not ask after a failed validation or after the last step', async () => {
    const current = new RunWorld(planWithStatuses(['IN_PROGRESS'], 1));
    current.sessions = [completingSession('s-1'), completingSession('s-2')];
    current.validations = [failing(), passing()];
    current.stepAnswers = [];
    expect((await runPlan(runContext(current))).stopReason).toBe('completed');
    expect(current.stepRequests).toEqual([]);
  });
});

describe('human-decision stops (RF8, RF9, CA-04, CA-06, TC-04, TC-06)', () => {
  it('stops with repeated_failure after two failures of the same step', async () => {
    const current = world([completingSession('s-1'), completingSession('s-2'), completingSession('s-3')], [failing(), failing('still failing')]);
    const result = await runPlan(runContext(current));
    expect(result).toMatchObject({ stopReason: 'repeated_failure', decisionStepId: 1, outputTail: 'still failing' });
    expect(current.launches).toHaveLength(2);
  });
  it('stops with no_checkpoint without validating or writing after a stale session', async () => {
    const current = world([{ events: [{ kind: 'started', sessionId: 's-1' }] }], [passing()]);
    const result = await runPlan(runContext(current));
    expect(result).toMatchObject({ stopReason: 'no_checkpoint', decisionStepId: 1 });
    expect(current.validationCommands).toEqual([]);
    expect(current.planWrites).toEqual([]);
  });
  it('stops with harness_error without validating', async () => {
    const current = world([{ agent: markActive('COMPLETED'), exitCode: 1 }], [passing()]);
    expect((await runPlan(runContext(current))).stopReason).toBe('harness_error');
    expect(current.validationCommands).toEqual([]);
  });
});
