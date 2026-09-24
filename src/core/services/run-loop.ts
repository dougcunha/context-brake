import { isPlanComplete, type PlanStep, type TaskPlan } from '../contracts/task-plan.js';
import { ensurePlanApproved } from './run-approvals.js';
import type { RunContext } from './run-context.js';
import { closeRun, openRun, resultWithoutRun } from './run-lifecycle.js';
import { decideBeforeSession, runLimitForEnd } from './run-limits.js';
import { runSession } from './run-session.js';
import { settleSession, type RunStop } from './run-step.js';
import type { RunResult } from './run-summary.js';
import type { RunTracker } from './run-tracker.js';
import { renderRunnerPrompt } from './runner-prompt.js';
import { recordSession, type SessionResult } from './session-record.js';

type StepTarget = { readonly plan: TaskPlan; readonly step: PlanStep };

export async function runPlan(context: RunContext): Promise<RunResult> {
  const startedAt = context.deps.clock.now();
  const { plan } = await context.deps.state.read();
  if (plan === null) return resultWithoutRun(context, { reason: 'no_checkpoint', startedAt, plan });
  if (!(await ensurePlanApproved(context, plan))) return resultWithoutRun(context, { reason: 'confirmation_required', startedAt, plan });
  const tracker = await openRun(context, { startedAt, plan });
  for (;;) {
    const stop = await nextSession(context, tracker);
    if (stop !== null) return closeRun(context, tracker, stop);
  }
}

async function nextSession(context: RunContext, tracker: RunTracker): Promise<RunStop | null> {
  if (context.deps.interrupt.isRequested()) return { reason: 'interrupted', limit: null };
  const { plan } = await context.deps.state.read();
  if (plan === null) return { reason: 'no_checkpoint', limit: null };
  tracker.observePlan(plan);
  const decision = decideBeforeSession({ plan, usage: tracker.usage(context.deps.clock.now()), failures: tracker.failures() }, context.settings.limits);
  if (decision.kind === 'stop') return { reason: decision.reason, limit: decision.limit };
  const step = selectStep(plan);
  if (step === null) return { reason: 'completed', limit: null };
  return runStepSession(context, tracker, { plan, step });
}

function selectStep(plan: TaskPlan): PlanStep | null {
  const current = plan.steps.find((step) => step.id === plan.currentStepId && step.status !== 'COMPLETED');
  const inProgress = plan.steps.find((step) => step.status === 'IN_PROGRESS');
  return current ?? inProgress ?? plan.steps.find((step) => step.status !== 'COMPLETED') ?? null;
}

async function runStepSession(context: RunContext, tracker: RunTracker, target: StepTarget): Promise<RunStop | null> {
  const { deps, settings } = context;
  const { step } = target;
  await deps.store.snapshotState(settings.runId);
  const index = tracker.sessions().length + 1;
  deps.progress.onProgress({ kind: 'session_started', index, stepId: step.id, stepTitle: step.title });
  const bootTokens = await deps.boot.estimate();
  const prompt = renderRunnerPrompt({ session: { index, maxSessions: settings.limits.maxSessions }, step, previousFailure: tracker.failureFor(step.id), files: settings.files });
  const session = await runSession(context, { prompt, runStartedAt: tracker.identity.startedAt, priorTokens: tracker.totalTokens().value, onStarted: (active) => deps.store.writeRecord(tracker.record(active)) });
  const settlement = await settleSession(context, { session, before: target.plan, stepId: step.id });
  await recordSession(context, tracker, { index, step, session, settlement, bootTokens });
  return afterSession(context, { step, session, settlement });
}

async function afterSession(context: RunContext, result: Omit<SessionResult, 'index' | 'bootTokens'>): Promise<RunStop | null> {
  if (result.settlement.stop !== null) return result.settlement.stop;
  if (result.settlement.plan !== null && isPlanComplete(result.settlement.plan)) return { reason: 'completed', limit: null };
  const limit = runLimitForEnd(result.session.endReason);
  if (limit !== null) return { reason: 'limit_reached', limit };
  const approver = context.deps.stepApprover;
  if (result.settlement.passed !== true || approver === null) return null;
  return (await approver.approve(result.step)) ? null : { reason: 'step_not_approved', limit: null };
}
