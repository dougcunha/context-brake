import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { ErrorRecordInput, LedgerLine, RuntimeErrorLog, SessionLedger, ToolLineInput } from '../../src/core/contracts/session-ledger.js';

const RECORDED_AT = '2026-10-08T17:00:00.000Z';

export class RecordingLedger implements SessionLedger {
  readonly lines: LedgerLine[] = [];
  async readLines(): Promise<readonly LedgerLine[]> { return [...this.lines]; }
  async appendSessionLine(key: SessionKey): Promise<void> { this.lines.push({ v: 1, type: 'session', at: RECORDED_AT, harness: key.harness, sessionId: key.sessionId, agentId: key.agentId }); }
  async appendToolLine(_key: SessionKey, input: ToolLineInput): Promise<void> { this.lines.push({ v: 1, type: 'tool', at: RECORDED_AT, ...input }); }
  async appendResetLine(): Promise<void> { return undefined; }
  async appendStatuslineLine(): Promise<void> { return undefined; }
  async pruneStaleSessions(): Promise<number> { return 0; }
  toolLine(): LedgerLine | undefined { return this.lines.find((line) => line.type === 'tool'); }
}

export class RecordingErrors implements RuntimeErrorLog {
  readonly records: ErrorRecordInput[] = [];
  async append(_harness: string, input: ErrorRecordInput): Promise<void> { this.records.push(input); }
}
