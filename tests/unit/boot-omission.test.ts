import { describe, expect, it } from 'vitest';
import type { RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../src/core/contracts/runtime.js';
import type { ErrorLine, ErrorRecordInput, RuntimeErrorLog, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';
import { renderBootOmission } from '../../src/core/services/boot-summary.js';
import { resolveFailure } from '../../src/core/services/failure-policy.js';

const AT = '2026-09-15T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const SESSION_START: RuntimeEvent = { kind: 'session_reset', session: KEY, reason: 'new' };
const BOOT_CAPABLE: RuntimeDescriptor = { harness: 'claude-code', capabilities: [{ id: 'session_boot', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: null };
const NO_BOOT: RuntimeDescriptor = { harness: 'opencode', capabilities: [{ id: 'session_boot', state: 'unsupported', impact: 'Stable boot injection is experimental in OpenCode.' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: null };

class TestLedger implements SessionLedger {
  async readLines(): Promise<readonly ToolLine[]> { return []; }
  appendSessionLine(): Promise<void> { return Promise.resolve(); }
  appendToolLine(): Promise<void> { return Promise.resolve(); }
  appendResetLine(): Promise<void> { return Promise.resolve(); }
  pruneStaleSessions(): Promise<number> { return Promise.resolve(0); }
}
class TestErrorLog implements RuntimeErrorLog {
  readonly records: ErrorLine[] = [];
  async append(harness: SessionKey['harness'], input: ErrorRecordInput): Promise<void> { this.records.push({ v: 1, at: AT, harness, ...input }); }
}
type Call = { readonly code: 'DEADLINE_EXCEEDED' | 'UNEXPECTED'; readonly descriptor: RuntimeDescriptor | null; readonly errors?: RuntimeErrorLog };
function decide(call: Call) {
  return resolveFailure({ event: SESSION_START, code: call.code, detail: call.code, config: null, descriptor: call.descriptor, ledger: new TestLedger(), errors: call.errors ?? new TestErrorLog(), readValidationCommand: async () => null });
}

describe('SessionStart timeout safe omission (DEC-EX-T14, TC-17)', () => {
  it('renders the versioned omission text with no state content', () => {
    expect(renderBootOmission()).toBe('[ContextBrake boot v1] Boot omitted: the internal deadline elapsed. Validate the plan and checkpoint state before continuing.');
  });
  it('reports the omission on a session start deadline when session boot is supported', async () => {
    const errors = new TestErrorLog();
    expect(await decide({ code: 'DEADLINE_EXCEEDED', descriptor: BOOT_CAPABLE, errors })).toEqual({ kind: 'context', block: renderBootOmission() });
    expect(errors.records[0]).toMatchObject({ event: 'session_reset', code: 'DEADLINE_EXCEEDED' });
  });
  it('stays neutral when the harness does not support session boot', async () => {
    expect(await decide({ code: 'DEADLINE_EXCEEDED', descriptor: NO_BOOT })).toEqual({ kind: 'neutral' });
  });
  it('stays neutral on a session start failure other than the deadline', async () => {
    expect(await decide({ code: 'UNEXPECTED', descriptor: BOOT_CAPABLE })).toEqual({ kind: 'neutral' });
  });
});
