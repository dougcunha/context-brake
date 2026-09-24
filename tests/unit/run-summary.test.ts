import { describe, expect, it } from 'vitest';
import { runSummarySchema } from '../../src/core/contracts/run-summary.js';
import { runPlan } from '../../src/core/services/run-loop.js';
import { buildRunSummary, decisionFor, type RunResult } from '../../src/core/services/run-summary.js';
import { runContext } from '../helpers/run-fakes.js';
import { planWithStatuses } from '../helpers/run-plans.js';
import { completingSession, failing, passing, RunWorld } from '../helpers/run-world.js';

async function resultOf(validations: RunWorld['validations'], harnessArgs: readonly string[] = []): Promise<RunResult> {
  const world = new RunWorld(planWithStatuses(['IN_PROGRESS', 'PENDING'], 1));
  world.sessions = [completingSession('s-1'), completingSession('s-2'), completingSession('s-3')];
  world.validations = validations;
  const context = runContext(world);
  return runPlan({ ...context, settings: { ...context.settings, harnessArgs } });
}

describe('run summary (RF18, DEC-15, CA-13)', () => {
  it('summarizes a completed run without a decision and matches the published schema', async () => {
    const summary = buildRunSummary(await resultOf([passing(), passing()], ['--permission-mode', 'acceptEdits']), 0);
    expect(summary).toMatchObject({ schemaVersion: 1, command: 'run', runId: 'run-1', status: 'completed', exitCode: 0, stopReason: 'completed', stepsCompleted: 2, stepsTotal: 2, sessionCount: 2, harnessArgs: ['--permission-mode', 'acceptEdits'] });
    expect(summary.decision).toBeUndefined();
    expect(summary.tokens).toEqual({ value: 2_000, source: 'measured' });
    expect(runSummarySchema.parse(summary)).toEqual(summary);
  });
  it('adds the decision request for a repeated failure (CA-04)', async () => {
    const summary = buildRunSummary(await resultOf([failing(), failing()]), 4);
    expect(summary).toMatchObject({ status: 'stopped', exitCode: 4, stopReason: 'repeated_failure', stepsCompleted: 0 });
    expect(summary.decision).toEqual({ reason: 'repeated_failure', stepId: 1, options: ['edit the plan or the step validation command', 'raise --max-failures', 'rerun context-brake run to resume from the plan'] });
    expect(runSummarySchema.safeParse(summary).success).toBe(true);
  });
  it.each(['no_checkpoint', 'harness_error', 'step_not_approved', 'confirmation_required'] as const)('offers options for %s', (stopReason) => {
    expect(decisionFor({ stopReason, decisionStepId: null })?.options.length).toBeGreaterThan(0);
  });
  it.each(['completed', 'limit_reached', 'interrupted'] as const)('requests no decision for %s', (stopReason) => {
    expect(decisionFor({ stopReason, decisionStepId: null })).toBeUndefined();
  });
  it('reports a run stopped before any session with zero counts', () => {
    const result: RunResult = { runId: null, status: 'stopped', stopReason: 'confirmation_required', limit: null, durationMs: 0, sessions: [], tokens: { value: 0, source: 'estimated' }, plan: null, decisionStepId: null, outputTail: null, harnessArgs: [] };
    expect(buildRunSummary(result, 2)).toMatchObject({ runId: null, stepsCompleted: 0, stepsTotal: 0, sessionCount: 0, exitCode: 2 });
  });
});
