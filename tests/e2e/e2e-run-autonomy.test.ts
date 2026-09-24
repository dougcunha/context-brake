import { describe, expect, it } from 'vitest';
import type { FakeSession } from '../support/fake-harness/install.js';
import { CEILING_TOOL_CHARACTERS, prepareAcceptanceProject, runAcceptance, workSteps, type AcceptanceHarness, type AcceptanceRun } from '../helpers/run-acceptance.js';
import { createRunProject, readPlanStatuses, removeRunProject, useScenario } from '../helpers/run-project.js';

const RUN_COUNT = 20;
const STEP_COUNT = 10;
const CONCURRENT_RUNS = 5;
const AUTONOMY_TIMEOUT_MS = 900_000;
const SESSION_MINUTES_BOUND = '2';
const CEILING_SESSION: FakeSession = { work: false, toolCharacters: CEILING_TOOL_CHARACTERS, hang: {} };

type AutonomyOutcome = { readonly index: number; readonly run: AcceptanceRun; readonly statuses: readonly string[] };

function ceilingScript(index: number): FakeSession[] {
  const ceilingStep = (index % STEP_COUNT) + 1;
  return Array.from({ length: ceilingStep }, (_, position) => (position === ceilingStep - 1 ? CEILING_SESSION : {}));
}

function harnessFor(index: number): AcceptanceHarness {
  return index % 2 === 0 ? 'claude-code' : 'codex-cli';
}

async function autonomousRun(index: number): Promise<AutonomyOutcome> {
  const world = await createRunProject(`cb-e2e-run-autonomy-${index}-`);
  try {
    await prepareAcceptanceProject(world, { harness: harnessFor(index), steps: workSteps(STEP_COUNT) });
    await useScenario(world, { work: true, checkpoint: true, sessions: ceilingScript(index) });
    const run = await runAcceptance(world, ['--harness', harnessFor(index), '--max-session-minutes', SESSION_MINUTES_BOUND]);
    return { index, run, statuses: await readPlanStatuses(world) };
  } finally {
    await removeRunProject(world);
  }
}

async function runAll(): Promise<AutonomyOutcome[]> {
  const outcomes: AutonomyOutcome[] = [];
  const pending = Array.from({ length: RUN_COUNT }, (_, index) => index);
  async function worker(): Promise<void> {
    for (let index = pending.shift(); index !== undefined; index = pending.shift()) outcomes.push(await autonomousRun(index));
  }
  await Promise.all(Array.from({ length: CONCURRENT_RUNS }, () => worker()));
  return outcomes.sort((left, right) => left.index - right.index);
}

describe('E2E run: autonomy objective (TC-23, CA-14, PRD "Objetivos")', () => {
  it(`completes a ${STEP_COUNT}-step plan in ${RUN_COUNT} of ${RUN_COUNT} runs with no human input, across critical-ceiling restarts`, async () => {
    const outcomes = await runAll();
    expect(outcomes).toHaveLength(RUN_COUNT);
    for (const { index, run, statuses } of outcomes) {
      const evidence = `run ${index}: ${run.stderr}`;
      expect(run.code, evidence).toBe(0);
      expect(run.summary, evidence).toMatchObject({ stopReason: 'completed', stepsCompleted: STEP_COUNT, stepsTotal: STEP_COUNT, sessionCount: STEP_COUNT + 1 });
      expect(statuses.every((status) => status === 'COMPLETED'), evidence).toBe(true);
      const ceiling = run.summary.sessions.filter((line) => line.endReason === 'critical_ceiling');
      expect(ceiling.map((line) => [line.stepId, line.finalZone]), evidence).toEqual([[(index % STEP_COUNT) + 1, 'CRITICAL']]);
    }
  }, AUTONOMY_TIMEOUT_MS);
});
