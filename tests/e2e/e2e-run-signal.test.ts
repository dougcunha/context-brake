import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepareAcceptanceProject, runAcceptance, workSteps, type AcceptanceHarness } from '../helpers/run-acceptance.js';
import { createRunProject, readPlanStatuses, removeRunProject, useScenario, type RunProject } from '../helpers/run-project.js';

let world: RunProject;
beforeEach(async () => { world = await createRunProject('cb-e2e-run-signal-'); });
afterEach(async () => { await removeRunProject(world); });

describe('E2E runner reset signal (RF3, RF9, DEC-05, TC-10)', () => {
  it.each<AcceptanceHarness>(['claude-code', 'codex-cli'])('validates after a trailing signal without a fresh checkpoint on %s', async (harness) => {
    await prepareAcceptanceProject(world, { harness, steps: workSteps(1) });
    await useScenario(world, { work: true, checkpoint: false, finalText: 'Step done.\n\n[REQUEST_SESSION_RESET]' });
    const result = await runAcceptance(world, ['--harness', harness]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.summary).toMatchObject({ stopReason: 'completed', sessionCount: 1 });
    expect(result.summary.sessions[0]).toMatchObject({ endReason: 'reset_signal', validation: { status: 'passed' } });
    expect(await readPlanStatuses(world)).toEqual(['COMPLETED']);
  });

  it.each<AcceptanceHarness>(['claude-code', 'codex-cli'])('stops when a mid-message signal has no fresh checkpoint on %s', async (harness) => {
    await prepareAcceptanceProject(world, { harness, steps: workSteps(1) });
    await useScenario(world, { work: true, checkpoint: false, finalText: '[REQUEST_SESSION_RESET]\nMore text' });
    const result = await runAcceptance(world, ['--harness', harness]);
    expect(result.summary).toMatchObject({ stopReason: 'no_checkpoint', sessionCount: 1 });
    expect(result.summary.sessions[0]).toMatchObject({ endReason: 'harness_exit', validation: { status: 'not_run' } });
    expect(await readPlanStatuses(world)).toEqual(['PENDING']);
  });
});
