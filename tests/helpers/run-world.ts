import type { RunProgressEvent } from '../../src/core/contracts/run-control.js';
import type { CommandForApproval, LedgerReading, SessionCommand, SessionStreamEvent, StateFile, ValidationOutcome } from '../../src/core/contracts/run-ports.js';
import type { ApprovalsFile, RunRecord, RunSessionLine } from '../../src/core/contracts/run-records.js';
import type { StateCheckpoint } from '../../src/core/contracts/state-checkpoint.js';
import type { PlanStep, TaskPlan } from '../../src/core/contracts/task-plan.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import { SESSION_RESET_SIGNAL } from '../../src/core/services/reset-notice.js';
import { checkpointAt } from './run-plans.js';

export type SessionScript = {
  readonly agent?: (world: RunWorld) => void;
  readonly events?: readonly SessionStreamEvent[];
  readonly zone?: Zone;
  readonly finalReading?: LedgerReading;
  readonly hang?: boolean;
  readonly exitCode?: number;
  readonly spawnFailed?: boolean;
  readonly unparsedLines?: number;
};
export type ValidationScript = Omit<ValidationOutcome, 'durationMs'> | 'hang' | 'interrupt';

export class RunWorld {
  nowMs = Date.parse('2026-09-23T10:00:00.000Z');
  checkpoint: StateCheckpoint | null = null;
  readonly planWrites: TaskPlan[] = [];
  readonly records: RunRecord[] = [];
  readonly lines: RunSessionLine[] = [];
  readonly restored: (readonly StateFile[])[] = [];
  snapshots = 0;
  pruned = 0;
  previousRun: RunRecord | null = null;
  approvals: ApprovalsFile = { v: 1, approved: [] };
  commandAnswers: boolean[] = [];
  readonly commandRequests: (readonly CommandForApproval[])[] = [];
  stepAnswers: boolean[] | null = null;
  readonly stepRequests: PlanStep[] = [];
  sessions: SessionScript[] = [];
  readonly launches: { readonly command: SessionCommand; readonly environment: Readonly<Record<string, string>> }[] = [];
  validations: ValidationScript[] = [];
  readonly validationCommands: string[] = [];
  readonly progress: RunProgressEvent[] = [];
  interruptRequested = false;
  watchZone: Zone | null = null;
  watchFinalReading: LedgerReading | null = null;
  afterSession: ((world: RunWorld) => void) | null = null;
  stops = 0;

  constructor(public plan: TaskPlan | null) {}

  now(): Date {
    return new Date(this.nowMs);
  }
}

export function signalEvents(sessionId: string, tokens = 1_000): SessionStreamEvent[] {
  return [{ kind: 'started', sessionId }, { kind: 'usage', tokens }, { kind: 'final_text', text: SESSION_RESET_SIGNAL }];
}

export function markActive(status: PlanStep['status']): (world: RunWorld) => void {
  return (world) => {
    const plan = world.plan;
    if (plan === null) return;
    const active = plan.steps.find((step) => step.id === plan.currentStepId && step.status !== 'COMPLETED') ?? plan.steps.find((step) => step.status !== 'COMPLETED');
    world.plan = { ...plan, steps: plan.steps.map((step) => (step.id === active?.id ? { ...step, status } : step)) };
    world.checkpoint = checkpointAt(world.now().toISOString(), active?.id ?? null);
  };
}

export function completingSession(sessionId: string): SessionScript {
  return { agent: markActive('COMPLETED'), events: signalEvents(sessionId) };
}

export function passing(): ValidationScript {
  return { status: 'passed', exitCode: 0, outputTail: 'ok' };
}

export function failing(outputTail = '1 test failed'): ValidationScript {
  return { status: 'failed', exitCode: 1, outputTail };
}
