import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { ErrorLine, ErrorRecordInput, RuntimeErrorLog, ToolLine } from '../../src/core/contracts/session-ledger.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import { DeadlineExceededError, failureDetail, failureErrorCode, LedgerUnreadableError, PayloadInvalidError, resolveFailure, runWithinDeadline } from '../../src/core/services/failure-policy.js';
import { configurationError } from '../helpers/configuration-issues.js';
import { DELEGATED_AT, DELEGATED_DESCRIPTOR, DELEGATED_KEY, delegatedConfig, MemoryLedger, toolCall } from '../helpers/delegated-fixtures.js';

const POST_TOOL = { kind: 'post_tool', session: DELEGATED_KEY, tool: toolCall({ name: 'Read', category: 'file_read' }), toolUseId: null } as const;
const INVALID_CONFIG = configurationError({ schemaVersion: 2 });

class TestErrorLog implements RuntimeErrorLog {
  readonly records: ErrorLine[] = [];
  async append(harness: SessionKey['harness'], input: ErrorRecordInput): Promise<void> { this.records.push({ v: 1, at: DELEGATED_AT, harness, ...input }); }
}
function toolLine(zone: Zone): ToolLine {
  return { v: 1, type: 'tool', at: DELEGATED_AT, toolUseId: null, observedCharacters: 0, turn: 1, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone, windowOrigin: 'harness' };
}
function deadlineFailure(zone: Zone, errors: RuntimeErrorLog) {
  return resolveFailure({ event: POST_TOOL, code: 'DEADLINE_EXCEEDED', detail: 'DeadlineExceededError', config: delegatedConfig({ resumeCommand: '/resume' }), descriptor: DELEGATED_DESCRIPTOR, ledger: new MemoryLedger([toolLine(zone)]), errors, timing: { phase: 'engine', elapsedMs: 1501 } });
}

afterEach(() => { vi.useRealTimers(); });

describe('failure policy in every zone (RF19, CA-16, DEC-09, TC-17, prd-12 FR-07, TC-10)', () => {
  it.each<Zone>(['GREEN', 'YELLOW', 'RED', 'CRITICAL'])('lets the tool call proceed after a deadline failure in %s and records it', async (zone) => {
    const errors = new TestErrorLog();
    expect(await deadlineFailure(zone, errors)).toEqual({ kind: 'neutral' });
    expect(errors.records).toEqual([{ v: 1, at: DELEGATED_AT, harness: 'claude-code', event: 'post_tool', code: 'DEADLINE_EXCEEDED', detail: 'DeadlineExceededError', phase: 'engine', elapsedMs: 1501 }]);
  });
  it('lets the tool call proceed when the runtime error log cannot be written', async () => {
    const errors: RuntimeErrorLog = { append: async () => { throw new Error('disk full'); } };
    expect(await deadlineFailure('CRITICAL', errors)).toEqual({ kind: 'neutral' });
  });
});

describe('failure classification and deadline (DEC-09, TC-17)', () => {
  it('maps every failure class to its documented code and detail', () => {
    const failures: unknown[] = [new DeadlineExceededError(), new LedgerUnreadableError(), new PayloadInvalidError(), INVALID_CONFIG, new TypeError('boom'), 'nope'];
    expect(failures.map((error) => [failureErrorCode(error), failureDetail(error)])).toEqual([
      ['DEADLINE_EXCEEDED', 'DeadlineExceededError'], ['LEDGER_UNREADABLE', 'LedgerUnreadableError'], ['PAYLOAD_INVALID', 'PayloadInvalidError'],
      ['INVALID_CONFIG', 'InvalidConfigurationError schemaVersion'], ['UNEXPECTED', 'TypeError'], ['UNEXPECTED', 'UnexpectedError'],
    ]);
  });
  it('settles with the work before the deadline and rejects with a deadline error after it', async () => {
    const failure = new Error('ledger write failed');
    await expect(runWithinDeadline(Promise.resolve(7))).resolves.toBe(7);
    await expect(runWithinDeadline(Promise.reject(failure))).rejects.toBe(failure);
    vi.useFakeTimers();
    const pending = runWithinDeadline(new Promise<never>(() => {}));
    const settled = expect(pending).rejects.toBeInstanceOf(DeadlineExceededError);
    await vi.advanceTimersByTimeAsync(1500);
    await settled;
  });
});
