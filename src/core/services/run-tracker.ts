import type { HarnessId } from '../contracts/harness.js';
import { RUN_RECORD_VERSION, type ActiveSession, type RunOutcome, type RunRecord, type RunSessionLine, type TokenCount } from '../contracts/run-records.js';
import type { PlanStepId, TaskPlan } from '../contracts/task-plan.js';
import { NO_FAILURES, recordValidation, type FailureStreak, type RunUsage } from './run-limits.js';
import type { Settlement, RunStop } from './run-step.js';
import type { PreviousFailure } from './runner-prompt.js';

export type RunIdentity = { readonly runId: string; readonly harness: HarnessId; readonly startedAt: Date; readonly resumedFrom: string | null };
export type RunClosing = { readonly stop: RunStop; readonly endedAt: Date; readonly plan: TaskPlan | null };
type StepFailure = { readonly stepId: PlanStepId; readonly failure: PreviousFailure };

export class RunTracker {
  private readonly lines: RunSessionLine[] = [];
  private streak: FailureStreak = NO_FAILURES;
  private lastFailure: StepFailure | null = null;
  private lastOutputTail: string | null = null;
  private plan: TaskPlan | null = null;

  constructor(readonly identity: RunIdentity) {}

  observePlan(plan: TaskPlan | null): void {
    if (plan !== null) this.plan = plan;
  }

  addSession(line: RunSessionLine, settlement: Settlement): void {
    this.lines.push(line);
    this.observePlan(settlement.plan);
    if (settlement.passed !== null) this.streak = recordValidation(this.streak, { stepId: line.stepId, passed: settlement.passed });
    if (settlement.validation.status !== 'not_run') this.lastOutputTail = settlement.outputTail;
    if (settlement.passed === true) this.lastFailure = null;
    if (settlement.failure !== null) this.lastFailure = { stepId: line.stepId, failure: settlement.failure };
  }

  usage(now: Date): RunUsage {
    return { sessions: this.lines.length, elapsedMs: now.getTime() - this.identity.startedAt.getTime(), tokens: this.totalTokens().value };
  }

  failures(): FailureStreak {
    return this.streak;
  }

  failureFor(stepId: PlanStepId): PreviousFailure | null {
    return this.lastFailure?.stepId === stepId ? this.lastFailure.failure : null;
  }

  lastPlan(): TaskPlan | null {
    return this.plan;
  }

  outputTail(): string | null {
    return this.lastOutputTail;
  }

  sessions(): readonly RunSessionLine[] {
    return [...this.lines];
  }

  totalTokens(): TokenCount {
    const value = this.lines.reduce((sum, line) => sum + line.sessionTokens.value, 0);
    const isMeasured = this.lines.length > 0 && this.lines.every((line) => line.sessionTokens.source === 'measured');
    return { value, source: isMeasured ? 'measured' : 'estimated' };
  }

  record(activeSession: ActiveSession | null): RunRecord {
    return this.baseRecord({ status: 'running', stopReason: null, limit: null, endedAt: null, activeSession });
  }

  finalRecord(closing: RunClosing): RunRecord {
    this.observePlan(closing.plan);
    const status = closingStatus(closing.stop);
    return this.baseRecord({ status, stopReason: closing.stop.reason, limit: closing.stop.limit, endedAt: closing.endedAt.toISOString(), activeSession: null });
  }

  private baseRecord(state: Pick<RunRecord, 'status' | 'stopReason' | 'limit' | 'endedAt' | 'activeSession'>): RunRecord {
    const stepsCompleted = this.plan?.steps.filter((step) => step.status === 'COMPLETED').length ?? 0;
    const counters = { sessions: this.lines.length, stepsCompleted, consecutiveFailures: this.streak.count, tokens: this.totalTokens() };
    const { runId, harness, startedAt, resumedFrom } = this.identity;
    return { v: RUN_RECORD_VERSION, runId, harness, ...state, startedAt: startedAt.toISOString(), resumedFrom, counters };
  }
}

export function closingStatus(stop: RunStop): RunOutcome {
  if (stop.reason === 'completed') return 'completed';
  return stop.reason === 'interrupted' ? 'interrupted' : 'stopped';
}
