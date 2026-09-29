import { describe, expect, it } from 'vitest';
import type { SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { ErrorLine, ErrorRecordInput, RuntimeErrorLog, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';
import type { WindowOrigin } from '../../src/core/contracts/zones.js';
import { resolveFailure } from '../../src/core/services/failure-policy.js';

const AT = '2026-09-28T17:05:08.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };

class OneLineLedger implements SessionLedger {
  constructor(private readonly line: ToolLine) {}
  async readLines(): Promise<readonly ToolLine[]> { return [this.line]; }
  appendSessionLine(): Promise<void> { return Promise.resolve(); }
  appendToolLine(): Promise<void> { return Promise.resolve(); }
  appendResetLine(): Promise<void> { return Promise.resolve(); }
  async appendStatuslineLine(): Promise<void> { return undefined; }
  pruneStaleSessions(): Promise<number> { return Promise.resolve(0); }
}
class Errors implements RuntimeErrorLog {
  readonly records: ErrorLine[] = [];
  async append(harness: SessionKey['harness'], input: ErrorRecordInput): Promise<void> { this.records.push({ v: 1, at: AT, harness, ...input }); }
}
function criticalLine(windowOrigin?: WindowOrigin): ToolLine {
  const line: ToolLine = { v: 1, type: 'tool', at: AT, toolUseId: null, observedCharacters: 0, turn: 13, usedTokens: 98000, windowTokens: 128000, estimatedTokens: 0, source: 'measured', zone: 'CRITICAL' };
  return windowOrigin === undefined ? line : { ...line, windowOrigin };
}
async function deadlineDecision(line: ToolLine) {
  const errors = new Errors();
  const decision = await resolveFailure({ event: { kind: 'pre_tool', session: KEY, tool: READ }, code: 'DEADLINE_EXCEEDED', detail: 'DeadlineExceededError', config: null, descriptor: null, ledger: new OneLineLedger(line), errors, readValidationCommand: async () => null });
  return { decision, errors };
}

describe('integration_failure only with a trusted last reading (prd-09 FR-03, DEC-04, TC-03)', () => {
  it('stays neutral and records the error when the last CRITICAL reading used the fallback window', async () => {
    const { decision, errors } = await deadlineDecision(criticalLine('config'));
    expect(decision).toEqual({ kind: 'neutral' });
    expect(errors.records[0]).toMatchObject({ event: 'pre_tool', code: 'DEADLINE_EXCEEDED' });
  });
  it.each<WindowOrigin>(['harness', 'declared'])('denies when the last CRITICAL reading had a %s window', async (origin) => {
    expect((await deadlineDecision(criticalLine(origin))).decision).toMatchObject({ kind: 'deny', reason: 'integration_failure' });
  });
  it('treats a line written before the origin existed as the fallback window', async () => {
    expect((await deadlineDecision(criticalLine())).decision).toEqual({ kind: 'neutral' });
  });
});
