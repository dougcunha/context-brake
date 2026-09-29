import { performance } from 'node:perf_hooks';
import type { HookPhase, PhaseTiming } from '../../core/contracts/hook-phase.js';
import type { RuntimeEvent } from '../../core/contracts/runtime.js';
import { DeadlineExceededError, INTERNAL_DEADLINE_MILLISECONDS } from '../../core/services/failure-policy.js';

export const SESSION_START_DEADLINE_MILLISECONDS = 5000;

export type DeadlineLimits = { readonly event: number; readonly sessionStart: number };
export const DEFAULT_DEADLINE_LIMITS: DeadlineLimits = { event: INTERNAL_DEADLINE_MILLISECONDS, sessionStart: SESSION_START_DEADLINE_MILLISECONDS };

export class HookDeadline {
  private phase: HookPhase;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private rejectExpired: (error: DeadlineExceededError) => void = () => undefined;
  private readonly startedAt: number;
  private readonly expired: Promise<never>;

  constructor(milliseconds: number, initialPhase: HookPhase, private readonly now: () => number = () => performance.now()) {
    this.phase = initialPhase;
    this.startedAt = now();
    this.expired = new Promise<never>((_, reject) => { this.rejectExpired = reject; });
    this.expired.catch(() => undefined);
    this.schedule(milliseconds);
  }

  readonly mark = (phase: HookPhase): void => { this.phase = phase; };

  extendTo(milliseconds: number): void {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.schedule(milliseconds);
  }

  async run<T>(work: Promise<T>): Promise<T> {
    try {
      return await Promise.race([work, this.expired]);
    } finally {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private schedule(milliseconds: number): void {
    const remaining = Math.max(0, milliseconds - (this.now() - this.startedAt));
    this.timer = setTimeout(() => { this.rejectExpired(new DeadlineExceededError(this.phase, Math.round(this.now() - this.startedAt))); }, remaining);
  }
}

export function deadlineFor(event: RuntimeEvent | null, limits: DeadlineLimits): number {
  return event?.kind === 'session_reset' ? limits.sessionStart : limits.event;
}
export function deadlineTiming(error: unknown): PhaseTiming | undefined {
  return error instanceof DeadlineExceededError ? { phase: error.phase, elapsedMs: error.elapsedMs } : undefined;
}
