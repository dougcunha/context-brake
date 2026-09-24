import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepareAcceptanceProject, readJournal, runAcceptance, workSteps, type AcceptanceHarness } from '../helpers/run-acceptance.js';
import { createRunProject, readPlanStatuses, removeRunProject, useScenario, type RunProject } from '../helpers/run-project.js';

const FAILURE_CLAUSE = 'The last validation of this step failed (exit 1).';

let world: RunProject;
beforeEach(async () => { world = await createRunProject('cb-e2e-run-steps-'); });
afterEach(async () => { await removeRunProject(world); });

async function prepare(harness: AcceptanceHarness): Promise<void> {
  await prepareAcceptanceProject(world, { harness, steps: workSteps(3) });
  await useScenario(world, { work: true, checkpoint: true, sessions: [{}, { work: false, markComplete: true }] });
}

describe('E2E run: steps advance only on the runner validation (TC-20, CA-01, CA-02, CA-03)', () => {
  it.each<AcceptanceHarness>(['claude-code', 'codex-cli'])('completes a 3-step plan on %s after one retried step', async (harness) => {
    await prepare(harness);
    const run = await runAcceptance(world, ['--harness', harness]);
    expect(run.code, run.stderr).toBe(0);
    expect(run.summary).toMatchObject({ status: 'completed', stopReason: 'completed', stepsCompleted: 3, stepsTotal: 3, sessionCount: 4 });
    expect(run.summary.sessions.map((line) => [line.stepId, line.validation.status])).toEqual([[1, 'passed'], [2, 'failed'], [2, 'passed'], [3, 'passed']]);
    expect(run.summary.sessions.every((line) => line.finalZone !== null)).toBe(true);
    expect(await readPlanStatuses(world)).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED']);
  });
});

describe('E2E run: session evidence of a retried step (TC-20, RF2, RF5, CA-02, CA-03)', () => {
  it('opens each session with the boot from the installed SessionStart hook (CA-01, RF2)', async () => {
    await prepare('claude-code');
    await runAcceptance(world, ['--harness', 'claude-code']);
    const journal = await readJournal(world);
    expect(journal).toHaveLength(4);
    for (const entry of journal) expect(entry.boot).toContain('additionalContext');
  });

  it('gives the retried session the same step with the failed validation clause (CA-02)', async () => {
    await prepare('claude-code');
    await runAcceptance(world, ['--harness', 'claude-code']);
    const journal = await readJournal(world);
    expect(journal.map((entry) => entry.stepId)).toEqual([1, 2, 2, 3]);
    expect(journal[1]?.stdin).not.toContain(FAILURE_CLAUSE);
    expect(journal[2]?.stdin).toContain(FAILURE_CLAUSE);
    expect(journal[3]?.stdin).not.toContain(FAILURE_CLAUSE);
  });

  it('reverts a step the agent marked complete without a passing validation and records the correction (CA-03)', async () => {
    await prepare('claude-code');
    const run = await runAcceptance(world, ['--harness', 'claude-code']);
    expect(run.summary.sessions[1]?.statusCorrections).toEqual([{ stepId: 2, from: 'COMPLETED', to: 'IN_PROGRESS' }]);
    expect(run.summary.sessions.filter((line) => line.statusCorrections.length > 0)).toHaveLength(1);
  });
});
