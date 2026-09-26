import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeErrorLog, SessionLedger } from '../../src/core/contracts/session-ledger.js';
import type { RuntimeEvent } from '../../src/core/contracts/runtime.js';
import { resolveFailure } from '../../src/core/services/failure-policy.js';
import { CountingPresence, DELEGATED_DESCRIPTOR, DELEGATED_KEY, MemoryLedger, SNAPSHOT_SECTION, sessionAtTurn, toolCall } from '../helpers/delegated-fixtures.js';

const LIGHT_CONFIG: ContextBrakeConfig = { ...DEFAULT_CONFIG, lightMode: { triggerZone: 'RED' }, delegatedSnapshot: { ...SNAPSHOT_SECTION, resumeCommand: '/sdd-orchestrate-flow' } };
const errors: RuntimeErrorLog = { append: async () => undefined };
class UnreadableLedger extends MemoryLedger {
  override async readLines(): Promise<never> { throw new Error('unreadable'); }
}
function failure(event: RuntimeEvent, ledger: SessionLedger, code: 'LEDGER_UNREADABLE' | 'DEADLINE_EXCEEDED') {
  return resolveFailure({ event, code, detail: code, config: LIGHT_CONFIG, descriptor: DELEGATED_DESCRIPTOR, ledger, errors, readValidationCommand: async () => null, planPresence: new CountingPresence(true) });
}

describe('light mode failure policy (TC-05, FR-06, FR-07, DEC-05, DEC-06)', () => {
  it('keeps a pre-tool call neutral when the ledger cannot be read', async () => {
    const event: RuntimeEvent = { kind: 'pre_tool', session: DELEGATED_KEY, tool: toolCall({ name: 'Write', category: 'file_write', paths: ['src/app.ts'] }) };
    expect(await failure(event, new UnreadableLedger(), 'LEDGER_UNREADABLE')).toEqual({ kind: 'neutral' });
  });
  it('keeps a pre-tool call neutral when the last recorded zone is CRITICAL', async () => {
    const event: RuntimeEvent = { kind: 'pre_tool', session: DELEGATED_KEY, tool: toolCall({ name: 'Bash', category: 'shell', command: 'rm -rf dist' }) };
    expect(await failure(event, new MemoryLedger(sessionAtTurn(12)), 'DEADLINE_EXCEEDED')).toEqual({ kind: 'neutral' });
  });
  it('injects nothing when a session reset passes the deadline', async () => {
    const event: RuntimeEvent = { kind: 'session_reset', session: DELEGATED_KEY, reason: 'clear' };
    expect(await failure(event, new MemoryLedger(), 'DEADLINE_EXCEEDED')).toEqual({ kind: 'neutral' });
  });
});
