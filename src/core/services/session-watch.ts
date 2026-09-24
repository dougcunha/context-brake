import type { HarnessSessionExit, LedgerReading, LedgerWatch, SessionStreamEvent } from '../contracts/run-ports.js';
import type { SessionEndReason, TokenCount } from '../contracts/run-records.js';
import type { Zone } from '../contracts/zones.js';
import { HARNESS_DETAIL_CHARACTERS, MILLISECONDS_PER_SECOND, SIGNAL_EXIT_GRACE_MILLISECONDS, type RunContext } from './run-context.js';
import { sessionLimitEnd, type SessionDeadline } from './run-limits.js';
import { endsWithResetSignal } from './reset-notice.js';

export type WatchEnd = { readonly forced: SessionEndReason | null; readonly exit: HarnessSessionExit };

export class SessionWatch {
  private sessionId: string | null = null;
  private finalText: string | null = null;
  private failedDetail: string | null = null;
  private measuredTokens: number | null = null;
  private reading: LedgerReading = { zone: null, tokens: null };
  private criticalAt: number | null = null;
  private signalAt: number | null = null;
  private ledger: LedgerWatch | null = null;

  constructor(private readonly context: RunContext, private readonly onStarted: (sessionId: string) => void) {}

  handle(event: SessionStreamEvent): void {
    switch (event.kind) {
      case 'started': return this.start(event.sessionId);
      case 'final_text': return this.finish(event.text);
      case 'usage': this.measuredTokens = event.tokens; return;
      case 'failed': this.failedDetail = event.detail; return;
    }
  }

  forcedEnd(deadline: SessionDeadline, priorTokens: number): SessionEndReason | null {
    const now = this.context.deps.clock.now().getTime();
    if (this.context.deps.interrupt.isRequested()) return 'interrupted';
    if (this.signalAt !== null && now >= this.signalAt + SIGNAL_EXIT_GRACE_MILLISECONDS) return 'reset_signal';
    if (this.isCriticalGraceOver(now)) return 'critical_ceiling';
    return sessionLimitEnd({ now: new Date(now), deadline, tokens: priorTokens + this.tokens().value }, this.context.settings.limits);
  }

  endReason(end: WatchEnd): SessionEndReason {
    if (end.forced !== null) return end.forced;
    if (end.exit.spawnFailed) return 'harness_error';
    if (this.signalAt !== null) return 'reset_signal';
    if (this.failedDetail !== null || end.exit.exitCode !== 0) return 'harness_error';
    return 'harness_exit';
  }

  tokens(): TokenCount {
    if (this.measuredTokens !== null) return { value: this.measuredTokens, source: 'measured' };
    return this.reading.tokens ?? { value: 0, source: 'estimated' };
  }

  finalZone(): Zone | null {
    return this.reading.zone;
  }

  harnessDetail(): string | null {
    return (this.finalText ?? this.failedDetail)?.slice(0, HARNESS_DETAIL_CHARACTERS) ?? null;
  }

  currentSessionId(): string | null {
    return this.sessionId;
  }

  async close(): Promise<void> {
    if (this.ledger === null) return;
    this.reading = await this.ledger.stop();
  }

  private start(sessionId: string): void {
    if (this.sessionId !== null) return;
    this.sessionId = sessionId;
    const key = { harness: this.context.deps.launcher.harness, sessionId, agentId: null };
    this.ledger = this.context.deps.watcher.watch(key, (reading) => { this.reading = reading; });
    this.onStarted(sessionId);
  }

  private finish(text: string): void {
    this.finalText = text;
    if (endsWithResetSignal(text) && this.signalAt === null) this.signalAt = this.context.deps.clock.now().getTime();
  }

  private isCriticalGraceOver(now: number): boolean {
    if (this.reading.zone !== 'CRITICAL') return false;
    this.criticalAt ??= now;
    return now >= this.criticalAt + this.context.settings.limits.criticalGraceSeconds * MILLISECONDS_PER_SECOND;
  }
}
