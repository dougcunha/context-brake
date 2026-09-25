import { describe, expect, it } from 'vitest';
import type { PlanPresence } from '../../src/core/contracts/checkpoint-mode.js';
import type { ToolCall } from '../../src/core/contracts/runtime.js';
import type { RuntimeErrorLog } from '../../src/core/contracts/session-ledger.js';
import { resolveFailure } from '../../src/core/services/failure-policy.js';
import { CountingPresence, DELEGATED_KEY, delegatedConfig, delegatedToolLine, FailingPresence, MemoryLedger, toolCall } from '../helpers/delegated-fixtures.js';

const FAILURE_DENY = '[ContextBrake v1] BLOCKED tool=Read zone=CRITICAL last recorded zone=CRITICAL reason=integration_failure. Allowed: read or write tasks/**/context-snapshot.md, skill sdd-snapshot, git status, git add, git commit. Run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET].';
const errors: RuntimeErrorLog = { append: async () => undefined };
function failAt(tool: ToolCall, planPresence: PlanPresence) {
  return resolveFailure({ event: { kind: 'pre_tool', session: DELEGATED_KEY, tool }, code: 'UNEXPECTED', detail: 'UnexpectedError', config: delegatedConfig(), descriptor: null, ledger: new MemoryLedger([delegatedToolLine(12)]), errors, readValidationCommand: async () => 'npm test', planPresence });
}

describe('failure policy in delegated mode (TC-08, FR-06, DEC-05)', () => {
  it('denies with the delegated failure message when the plan file is missing', async () => {
    const decision = await failAt(toolCall({ name: 'Read', category: 'file_read', paths: ['src/a.ts'] }), new CountingPresence(false));
    expect(decision).toEqual({ kind: 'deny', tool: 'Read', reason: 'integration_failure', message: FAILURE_DENY });
  });
  it('allows a snapshot write when the plan file is missing', async () => {
    const write = toolCall({ name: 'Write', category: 'file_write', paths: ['tasks/x/context-snapshot.md'] });
    expect(await failAt(write, new CountingPresence(false))).toEqual({ kind: 'neutral' });
  });
  it('uses the union of both allowlists when the plan file cannot be checked', async () => {
    const presence = new FailingPresence();
    expect(await failAt(toolCall({ name: 'Bash', category: 'shell', command: 'npm test' }), presence)).toEqual({ kind: 'neutral' });
    expect(await failAt(toolCall({ name: 'Write', category: 'file_write', paths: ['tasks/x/context-snapshot.md'] }), presence)).toEqual({ kind: 'neutral' });
    expect(await failAt(toolCall({ name: 'Read', category: 'file_read', paths: ['src/a.ts'] }), presence)).toEqual({ kind: 'deny', tool: 'Read', reason: 'integration_failure', message: FAILURE_DENY });
  });
});
