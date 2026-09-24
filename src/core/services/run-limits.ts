import type { RunLimit, RunStopReason, SessionEndReason } from '../contracts/run-records.js';
import type { RunnerConfiguration } from '../contracts/runner-configuration.js';
import { isPlanComplete, type PlanStepId, type TaskPlan } from '../contracts/task-plan.js';

const MILLISECONDS_PER_MINUTE = 60_000;

export type RunUsage = { readonly sessions: number; readonly elapsedMs: number; readonly tokens: number };
export type FailureStreak = { readonly stepId: PlanStepId | null; readonly count: number };
export type ValidationResult = { readonly stepId: PlanStepId; readonly passed: boolean };
export type PreSessionInput = { readonly plan: TaskPlan; readonly usage: RunUsage; readonly failures: FailureStreak };
export type RunDecision =
  | { readonly kind: 'continue' }
  | { readonly kind: 'stop'; readonly reason: RunStopReason; readonly limit: RunLimit | null };
export type DeadlineInput = { readonly runStartedAt: Date; readonly sessionStartedAt: Date };
export type SessionDeadline = { readonly at: Date; readonly limit: 'maxSessionMinutes' | 'maxTotalMinutes' };
export type SessionProgress = { readonly now: Date; readonly deadline: SessionDeadline; readonly tokens: number };
export type SessionLimitEnd = Extract<SessionEndReason, 'session_timeout' | 'run_timeout' | 'token_limit'>;

export const NO_FAILURES: FailureStreak = { stepId: null, count: 0 };

export function recordValidation(streak: FailureStreak, result: ValidationResult): FailureStreak {
  if (result.passed) return NO_FAILURES;
  if (streak.stepId === result.stepId) return { stepId: result.stepId, count: streak.count + 1 };
  return { stepId: result.stepId, count: 1 };
}

export function isRepeatedFailure(streak: FailureStreak, limits: RunnerConfiguration): boolean {
  return streak.count >= limits.maxConsecutiveFailures;
}

export function exceededRunLimit(usage: RunUsage, limits: RunnerConfiguration): RunLimit | null {
  if (usage.sessions >= limits.maxSessions) return 'maxSessions';
  if (usage.elapsedMs >= limits.maxTotalMinutes * MILLISECONDS_PER_MINUTE) return 'maxTotalMinutes';
  if (usage.tokens >= limits.maxTotalTokens) return 'maxTotalTokens';
  return null;
}

export function decideBeforeSession(input: PreSessionInput, limits: RunnerConfiguration): RunDecision {
  if (isPlanComplete(input.plan)) return { kind: 'stop', reason: 'completed', limit: null };
  if (isRepeatedFailure(input.failures, limits)) return { kind: 'stop', reason: 'repeated_failure', limit: null };
  const limit = exceededRunLimit(input.usage, limits);
  if (limit !== null) return { kind: 'stop', reason: 'limit_reached', limit };
  return { kind: 'continue' };
}

export function sessionDeadline(input: DeadlineInput, limits: RunnerConfiguration): SessionDeadline {
  const sessionEnd = input.sessionStartedAt.getTime() + limits.maxSessionMinutes * MILLISECONDS_PER_MINUTE;
  const runEnd = input.runStartedAt.getTime() + limits.maxTotalMinutes * MILLISECONDS_PER_MINUTE;
  if (runEnd <= sessionEnd) return { at: new Date(runEnd), limit: 'maxTotalMinutes' };
  return { at: new Date(sessionEnd), limit: 'maxSessionMinutes' };
}

export function sessionLimitEnd(progress: SessionProgress, limits: RunnerConfiguration): SessionLimitEnd | null {
  if (progress.tokens >= limits.maxTotalTokens) return 'token_limit';
  if (progress.now.getTime() < progress.deadline.at.getTime()) return null;
  return progress.deadline.limit === 'maxTotalMinutes' ? 'run_timeout' : 'session_timeout';
}

export function runLimitForEnd(endReason: SessionEndReason): RunLimit | null {
  if (endReason === 'run_timeout') return 'maxTotalMinutes';
  if (endReason === 'token_limit') return 'maxTotalTokens';
  return null;
}
