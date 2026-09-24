import { RUN_RECORD_VERSION, type RunSessionLine } from '../contracts/run-records.js';
import type { PlanStep } from '../contracts/task-plan.js';
import type { RunContext } from './run-context.js';
import type { SessionOutcome } from './run-session.js';
import type { Settlement } from './run-step.js';
import type { RunTracker } from './run-tracker.js';

export type SessionResult = { readonly index: number; readonly step: PlanStep; readonly session: SessionOutcome; readonly settlement: Settlement; readonly bootTokens: number };

export async function recordSession(context: RunContext, tracker: RunTracker, result: SessionResult): Promise<void> {
  const line = sessionLine(context, result);
  tracker.addSession(line, result.settlement);
  await context.deps.store.appendSession(context.settings.runId, line);
  await context.deps.store.writeRecord(tracker.record(null));
  const harnessDetail = result.session.endReason === 'harness_error' ? result.session.harnessDetail : null;
  context.deps.progress.onProgress({ kind: 'session_finished', line, stepTitle: result.step.title, outputTail: result.settlement.outputTail, harnessDetail });
}

function sessionLine(context: RunContext, result: SessionResult): RunSessionLine {
  const { session, settlement } = result;
  return {
    v: RUN_RECORD_VERSION,
    index: result.index,
    harness: context.deps.launcher.harness,
    sessionId: session.sessionId,
    stepId: result.step.id,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt.toISOString(),
    durationMs: session.endedAt.getTime() - session.startedAt.getTime(),
    endReason: session.endReason,
    streamParseErrors: session.streamParseErrors,
    validation: settlement.validation,
    bootTokens: { value: result.bootTokens, source: 'estimated' },
    sessionTokens: session.tokens,
    finalZone: session.finalZone,
    statusCorrections: [...settlement.statusCorrections],
  };
}
