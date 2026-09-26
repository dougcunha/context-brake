import { describe, expect, it, vi } from 'vitest';
import type { ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeEvent, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { ErrorLine, ErrorRecordInput, RuntimeErrorLog, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';
import { DeadlineExceededError, failureDetail, failureErrorCode, LedgerUnreadableError, PayloadInvalidError, resolveFailure, runWithinDeadline } from '../../src/core/services/failure-policy.js';

const AT = '2026-09-15T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const CHECKPOINT_WRITE: ToolCall = { name: 'Write', category: 'file_write', paths: ['state_checkpoint.json'], command: null };
const GIT_ADD: ToolCall = { name: 'Bash', category: 'shell', paths: [], command: 'git add src/a.ts' };

class TestLedger implements SessionLedger {
  failReads = false;
  constructor(readonly lines: ToolLine[] = []) {}
  async readLines(): Promise<readonly ToolLine[]> { if (this.failReads) throw new Error('unreadable'); return this.lines; }
  appendSessionLine(): Promise<void> { return Promise.resolve(); }
  appendToolLine(): Promise<void> { return Promise.resolve(); }
  appendResetLine(): Promise<void> { return Promise.resolve(); }
  async appendStatuslineLine(): Promise<void> { return undefined; }
  pruneStaleSessions(): Promise<number> { return Promise.resolve(0); }
}
class TestErrorLog implements RuntimeErrorLog {
  readonly records: ErrorLine[] = [];
  async append(harness: SessionKey['harness'], input: ErrorRecordInput): Promise<void> { this.records.push({ v: 1, at: AT, harness, ...input }); }
}
function toolLine(zone: ToolLine['zone']): ToolLine {
  return { v: 1, type: 'tool', at: AT, toolUseId: null, observedCharacters: 0, turn: 1, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone };
}
type FailureCall = { readonly event: RuntimeEvent; readonly ledger: SessionLedger; readonly errors: RuntimeErrorLog; readonly config?: ContextBrakeConfig | null };
function failure(input: FailureCall) {
  return resolveFailure({ event: input.event, code: 'UNEXPECTED', detail: 'UnexpectedError', config: input.config ?? null, descriptor: null, ledger: input.ledger, errors: input.errors, readValidationCommand: async () => null });
}

describe('failure policy decisions (RF19, CA-16, DEC-09, TC-17)', () => {
  it('stays neutral below the ceiling and records the error', async () => {
    const errors = new TestErrorLog();
    expect(await failure({ event: { kind: 'pre_tool', session: KEY, tool: READ }, ledger: new TestLedger([toolLine('GREEN')]), errors })).toEqual({ kind: 'neutral' });
    expect(errors.records[0]).toMatchObject({ event: 'pre_tool', code: 'UNEXPECTED', detail: 'UnexpectedError' });
  });
  it('denies a code read with the failure variant at the last recorded critical zone', async () => {
    const errors = new TestErrorLog();
    const decision = await failure({ event: { kind: 'pre_tool', session: KEY, tool: READ }, ledger: new TestLedger([toolLine('CRITICAL')]), errors });
    expect(decision).toMatchObject({ kind: 'deny', tool: 'Read', reason: 'integration_failure' });
    if (decision.kind !== 'deny') throw new Error('expected deny');
    expect(decision.message).toContain('last recorded zone=CRITICAL');
    expect(decision.message).toContain('reason=integration_failure');
    expect(decision.message).toContain('Allowed: read or write task_plan.json and state_checkpoint.json');
    expect(errors.records).toHaveLength(1);
  });
  it('keeps the allowlist usable above the ceiling', async () => {
    const ledger = new TestLedger([toolLine('CRITICAL')]);
    const errors = new TestErrorLog();
    expect(await failure({ event: { kind: 'pre_tool', session: KEY, tool: CHECKPOINT_WRITE }, ledger, errors })).toEqual({ kind: 'neutral' });
    expect(await failure({ event: { kind: 'pre_tool', session: KEY, tool: GIT_ADD }, ledger, errors })).toEqual({ kind: 'neutral' });
  });
});

describe('failure policy edges (DEC-09, TC-17)', () => {
  it('uses default paths and no extra commands with an invalid configuration', async () => {
    const errors = new TestErrorLog();
    const event: RuntimeEvent = { kind: 'pre_tool', session: KEY, tool: GIT_ADD };
    expect(await failure({ event, ledger: new TestLedger([toolLine('CRITICAL')]), errors, config: null })).toEqual({ kind: 'neutral' });
  });
  it('stays neutral when the ledger cannot be read', async () => {
    const ledger = new TestLedger();
    ledger.failReads = true;
    const errors = new TestErrorLog();
    expect(await failure({ event: { kind: 'pre_tool', session: KEY, tool: READ }, ledger, errors })).toEqual({ kind: 'neutral' });
    expect(errors.records).toHaveLength(1);
  });
});

describe('failure classification and deadline (DEC-09, TC-17)', () => {
  it('maps every failure class to its documented code and detail', () => {
    expect(failureErrorCode(new DeadlineExceededError())).toBe('DEADLINE_EXCEEDED');
    expect(failureErrorCode(new LedgerUnreadableError())).toBe('LEDGER_UNREADABLE');
    expect(failureErrorCode(new PayloadInvalidError())).toBe('PAYLOAD_INVALID');
    expect(failureErrorCode(new TypeError('boom'))).toBe('UNEXPECTED');
    expect(failureDetail(new DeadlineExceededError())).toBe('DeadlineExceededError');
    expect(failureDetail(new PayloadInvalidError())).toBe('PayloadInvalidError');
    expect(failureDetail('nope')).toBe('UnexpectedError');
  });
  it('rejects with a deadline error and records DEADLINE_EXCEEDED', async () => {
    vi.useFakeTimers();
    const pending = runWithinDeadline(new Promise<never>(() => {}));
    const settled = expect(pending).rejects.toBeInstanceOf(DeadlineExceededError);
    await vi.advanceTimersByTimeAsync(1500);
    await settled;
    vi.useRealTimers();
    const errors = new TestErrorLog();
    const decision = await resolveFailure({ event: { kind: 'pre_tool', session: KEY, tool: READ }, code: 'DEADLINE_EXCEEDED', detail: 'DeadlineExceededError', config: null, descriptor: null, ledger: new TestLedger([toolLine('CRITICAL')]), errors, readValidationCommand: async () => null });
    expect(decision).toMatchObject({ kind: 'deny', reason: 'integration_failure' });
    expect(errors.records[0]?.code).toBe('DEADLINE_EXCEEDED');
  });
});
