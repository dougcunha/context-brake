import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepareAcceptanceProject, readJournal, readStateBytes, runAcceptance, workSteps } from '../helpers/run-acceptance.js';
import { createRunProject, readPlanStatuses, removeRunProject, useScenario, type RunProject } from '../helpers/run-project.js';

const FAILING_COMMAND = 'node -e "console.log(\'parser broke\'); process.exit(1)"';
const HANGING_COMMAND = 'node -e "setInterval(() => undefined, 1000)"';
const HARNESS = ['--harness', 'claude-code'];

let world: RunProject;
beforeEach(async () => { world = await createRunProject('cb-e2e-run-stops-'); });
afterEach(async () => { await removeRunProject(world); });

describe('E2E run: repeated validation failure asks for a decision (TC-21, CA-04, RF8)', () => {
  it('stops with exit 4 after two consecutive failures of the same step, naming the step and the output', async () => {
    await prepareAcceptanceProject(world, { harness: 'claude-code', steps: [{ title: 'Add parser', validationCommand: FAILING_COMMAND }] });
    await useScenario(world, { checkpoint: true });
    const run = await runAcceptance(world, HARNESS);
    expect(run.code).toBe(4);
    expect(run.summary).toMatchObject({ stopReason: 'repeated_failure', sessionCount: 2, decision: { reason: 'repeated_failure', stepId: 1 } });
    expect(run.stderr).toContain('parser broke');
    expect(run.stderr).toContain('Add parser');
    expect(await readPlanStatuses(world)).toEqual(['IN_PROGRESS']);
  });
});

describe('E2E run: session ceiling (TC-21, CA-05, RF7)', () => {
  it('opens no sixth session when five sessions leave steps pending, and exits 3 naming the limit', async () => {
    await prepareAcceptanceProject(world, { harness: 'claude-code', steps: workSteps(6) });
    await useScenario(world, { work: true, checkpoint: true });
    const run = await runAcceptance(world, [...HARNESS, '--max-sessions', '5']);
    expect(run.code).toBe(3);
    expect(run.summary).toMatchObject({ stopReason: 'limit_reached', limit: 'maxSessions', sessionCount: 5, stepsCompleted: 5 });
    expect(await readJournal(world)).toHaveLength(5);
    expect(await readPlanStatuses(world)).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS']);
  });
});

describe('E2E run: session without checkpoint or reset signal (TC-21, CA-06, RF9)', () => {
  it('stops with exit 4, runs no validation, and leaves plan and checkpoint bytes untouched', async () => {
    await prepareAcceptanceProject(world, { harness: 'claude-code', steps: workSteps(2) });
    await useScenario(world, { work: true, finalText: 'I think I am done.' });
    const before = await readStateBytes(world);
    const run = await runAcceptance(world, HARNESS);
    expect(run.code).toBe(4);
    expect(run.summary).toMatchObject({ stopReason: 'no_checkpoint', sessionCount: 1 });
    expect(run.summary.sessions[0]).toMatchObject({ endReason: 'harness_exit', validation: { status: 'not_run' } });
    expect(await readStateBytes(world)).toEqual(before);
  });
});

describe('E2E run: validation timeout (TC-21, CA-07, RF10)', () => {
  it('counts a hanging validation as a failure, retries the step, and then stops with exit 4', async () => {
    await prepareAcceptanceProject(world, { harness: 'claude-code', steps: [{ title: 'Slow check', validationCommand: HANGING_COMMAND }] });
    await useScenario(world, { checkpoint: true });
    const run = await runAcceptance(world, [...HARNESS, '--validation-timeout', '1']);
    expect(run.code).toBe(4);
    expect(run.summary.stopReason).toBe('repeated_failure');
    expect(run.summary.sessions.map((line) => line.validation.status)).toEqual(['timed_out', 'timed_out']);
    expect((await readJournal(world)).map((entry) => entry.stepId)).toEqual([1, 1]);
  });
});
