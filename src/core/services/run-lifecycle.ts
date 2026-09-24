import { STATE_FILES, type RunStore, type StateFile } from '../contracts/run-ports.js';
import type { RunStopReason } from '../contracts/run-records.js';
import type { StateReading } from '../contracts/run-control.js';
import type { TaskPlan } from '../contracts/task-plan.js';
import type { RunContext } from './run-context.js';
import type { RunStop } from './run-step.js';
import type { RunResult } from './run-summary.js';
import { closingStatus, RunTracker } from './run-tracker.js';

export type RunOpening = { readonly startedAt: Date; readonly plan: TaskPlan };
export type UnstartedRun = { readonly reason: RunStopReason; readonly startedAt: Date; readonly plan: TaskPlan | null };

export async function openRun(context: RunContext, opening: RunOpening): Promise<RunTracker> {
  const { store, launcher } = context.deps;
  const resumedFrom = await resumableRunId(store);
  await store.pruneRuns();
  const tracker = new RunTracker({ runId: context.settings.runId, harness: launcher.harness, startedAt: opening.startedAt, resumedFrom });
  tracker.observePlan(opening.plan);
  await store.writeRecord(tracker.record(null));
  return tracker;
}

export async function closeRun(context: RunContext, tracker: RunTracker, stop: RunStop): Promise<RunResult> {
  const { deps, settings } = context;
  if (stop.reason === 'interrupted' && tracker.sessions().length > 0) await restoreInvalidState(context);
  const endedAt = deps.clock.now();
  const { plan } = await deps.state.read();
  await deps.store.writeRecord(tracker.finalRecord({ stop, endedAt, plan }));
  return {
    runId: settings.runId, status: closingStatus(stop), stopReason: stop.reason, limit: stop.limit,
    durationMs: endedAt.getTime() - tracker.identity.startedAt.getTime(), sessions: tracker.sessions(), tokens: tracker.totalTokens(),
    plan: plan ?? tracker.lastPlan(), decisionStepId: decisionStepId(tracker, stop), outputTail: tracker.outputTail(), harnessArgs: settings.harnessArgs,
  };
}

export function resultWithoutRun(context: RunContext, run: UnstartedRun): RunResult {
  const stop: RunStop = { reason: run.reason, limit: null };
  return {
    runId: null, status: closingStatus(stop), stopReason: run.reason, limit: null,
    durationMs: context.deps.clock.now().getTime() - run.startedAt.getTime(), sessions: [], tokens: { value: 0, source: 'estimated' },
    plan: run.plan, decisionStepId: null, outputTail: null, harnessArgs: context.settings.harnessArgs,
  };
}

export function invalidStateFiles(reading: StateReading): StateFile[] {
  return STATE_FILES.filter((file) => (file === 'plan' ? reading.plan : reading.checkpoint) === null);
}

async function restoreInvalidState(context: RunContext): Promise<void> {
  const invalid = invalidStateFiles(await context.deps.state.read());
  if (invalid.length > 0) await context.deps.store.restoreState(context.settings.runId, invalid);
}

async function resumableRunId(store: RunStore): Promise<string | null> {
  const latest = await store.latestRunId();
  if (latest === null) return null;
  const record = await store.readRecord(latest);
  return record === null || record.status === 'completed' ? null : latest;
}

function decisionStepId(tracker: RunTracker, stop: RunStop): RunResult['decisionStepId'] {
  if (stop.reason === 'repeated_failure') return tracker.failures().stepId;
  return tracker.sessions().at(-1)?.stepId ?? null;
}
