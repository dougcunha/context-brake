import { beforeAll, describe, expect, it } from 'vitest';
import type { PlanStepStatus } from '../../src/core/contracts/task-plan.js';
import { prepareAcceptanceProject, readJournal, runAcceptance, workSteps, type AcceptanceHarness, type AcceptanceRun, type JournalEntry } from '../helpers/run-acceptance.js';
import { createRunProject, readPlanStatuses, removeRunProject, useScenario } from '../helpers/run-project.js';

const FAILURE_CLAUSE = 'The last validation of this step failed (exit 1).';
const RUN_TIMEOUT_MS = 120_000;

type RetriedRun = { readonly run: AcceptanceRun; readonly journal: JournalEntry[]; readonly statuses: PlanStepStatus[] };

const retriedRuns = new Map<AcceptanceHarness, Promise<RetriedRun>>();

async function runRetriedPlan(harness: AcceptanceHarness): Promise<RetriedRun> {
  const world = await createRunProject('cb-e2e-run-steps-');
  try {
    await prepareAcceptanceProject(world, { harness, steps: workSteps(3) });
    await useScenario(world, { work: true, checkpoint: true, sessions: [{}, { work: false, markComplete: true }] });
    const run = await runAcceptance(world, ['--harness', harness]);
    return { run, journal: await readJournal(world), statuses: await readPlanStatuses(world) };
  } finally {
    await removeRunProject(world);
  }
}

function retriedRun(harness: AcceptanceHarness): Promise<RetriedRun> {
  const pending = retriedRuns.get(harness) ?? runRetriedPlan(harness);
  retriedRuns.set(harness, pending);
  return pending;
}

describe.each<AcceptanceHarness>(['claude-code', 'codex-cli'])('E2E run: steps advance only on the runner validation on %s (TC-20, CA-01, CA-02, CA-03)', (harness) => {
  let retried: RetriedRun;
  beforeAll(async () => { retried = await retriedRun(harness); }, RUN_TIMEOUT_MS);

  it('completes a 3-step plan after one retried step', () => {
    const { run, statuses } = retried;
    expect(run.code, run.stderr).toBe(0);
    expect(run.summary).toMatchObject({ status: 'completed', stopReason: 'completed', stepsCompleted: 3, stepsTotal: 3, sessionCount: 4 });
    expect(run.summary.sessions.map((line) => [line.stepId, line.validation.status])).toEqual([[1, 'passed'], [2, 'failed'], [2, 'passed'], [3, 'passed']]);
    expect(run.summary.sessions.every((line) => line.finalZone !== null)).toBe(true);
    expect(statuses).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED']);
  });

  it('reverts a step the agent marked complete without a passing validation and records the correction (CA-03)', () => {
    const { sessions } = retried.run.summary;
    expect(sessions[1]?.statusCorrections).toEqual([{ stepId: 2, from: 'COMPLETED', to: 'IN_PROGRESS' }]);
    expect(sessions.filter((line) => line.statusCorrections.length > 0)).toHaveLength(1);
  });
});

describe('E2E run: session evidence of a retried step on claude-code (TC-20, RF2, RF5, CA-01, CA-02)', () => {
  let retried: RetriedRun;
  beforeAll(async () => { retried = await retriedRun('claude-code'); }, RUN_TIMEOUT_MS);

  it('opens each session with the boot from the installed SessionStart hook (CA-01, RF2)', () => {
    expect(retried.journal).toHaveLength(4);
    for (const entry of retried.journal) expect(entry.boot).toContain('additionalContext');
  });

  it('gives the retried session the same step with the failed validation clause (CA-02)', () => {
    const { journal } = retried;
    expect(journal.map((entry) => entry.stepId)).toEqual([1, 2, 2, 3]);
    expect(journal[1]?.stdin).not.toContain(FAILURE_CLAUSE);
    expect(journal[2]?.stdin).toContain(FAILURE_CLAUSE);
    expect(journal[3]?.stdin).not.toContain(FAILURE_CLAUSE);
  });
});
