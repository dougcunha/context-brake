import type { ActiveSession } from '../../core/contracts/run-records.js';
import type { LedgerReading, LedgerWatch, LedgerWatcher } from '../../core/contracts/run-ports.js';
import type { SessionLedger } from '../../core/contracts/session-ledger.js';
import { summarizeLedger } from '../../core/services/session-counters.js';

export const LEDGER_POLL_MILLISECONDS = 1_000;
const EMPTY_READING: LedgerReading = { zone: null, tokens: null };

export function readingFromLedger(summary: ReturnType<typeof summarizeLedger>): LedgerReading {
  const last = summary.lastReading;
  if (last === null) return EMPTY_READING;
  return { zone: last.zone, tokens: { value: last.usedTokens, source: last.source } };
}

export class NodeLedgerWatcher implements LedgerWatcher {
  constructor(private readonly ledger: Pick<SessionLedger, 'readLines'>, private readonly intervalMilliseconds: number = LEDGER_POLL_MILLISECONDS) {}

  watch(session: ActiveSession, onReading: (reading: LedgerReading) => void): LedgerWatch {
    return new LedgerPoll({ ledger: this.ledger, session, onReading }, this.intervalMilliseconds);
  }
}

type PollTarget = { readonly ledger: Pick<SessionLedger, 'readLines'>; readonly session: ActiveSession; readonly onReading: (reading: LedgerReading) => void };

class LedgerPoll implements LedgerWatch {
  private reading: LedgerReading = EMPTY_READING;
  private activePoll: Promise<void> | null = null;
  private finishing: Promise<LedgerReading> | null = null;
  private stopped = false;
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly target: PollTarget, intervalMilliseconds: number) {
    this.timer = setInterval(() => this.poll(), intervalMilliseconds);
    this.timer.unref();
    this.poll();
  }

  latest(): LedgerReading {
    return this.reading;
  }

  stop(): Promise<LedgerReading> {
    this.finishing ??= this.finish();
    return this.finishing;
  }

  private async finish(): Promise<LedgerReading> {
    this.stopped = true;
    clearInterval(this.timer);
    await this.activePoll;
    await this.read(true);
    return this.reading;
  }

  private poll(): void {
    if (this.activePoll !== null || this.stopped) return;
    this.activePoll = this.read(false).finally(() => { this.activePoll = null; });
  }

  private async read(final: boolean): Promise<void> {
    let reading: LedgerReading;
    try {
      reading = readingFromLedger(summarizeLedger(await this.target.ledger.readLines(this.target.session)));
    } catch {
      if (!this.stopped || final) this.target.onReading(this.reading);
      return;
    }
    if (this.stopped && !final) return;
    this.reading = reading;
    this.target.onReading(reading);
  }
}
