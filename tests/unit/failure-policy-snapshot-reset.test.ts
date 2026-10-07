import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeErrorLog } from '../../src/core/contracts/session-ledger.js';
import { resolveFailure } from '../../src/core/services/failure-policy.js';
import { DELEGATED_DESCRIPTOR, DELEGATED_KEY, delegatedConfig, MemoryLedger } from '../helpers/delegated-fixtures.js';

const RESUME_BLOCK = '[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.';
const errors: RuntimeErrorLog = { append: async () => undefined };
function resetPastDeadline(config: ContextBrakeConfig) {
  return resolveFailure({ event: { kind: 'session_reset', session: DELEGATED_KEY, reason: 'new' }, code: 'DEADLINE_EXCEEDED', detail: 'DeadlineExceededError', config, descriptor: DELEGATED_DESCRIPTOR, ledger: new MemoryLedger(), errors });
}

describe('session reset past the deadline (prd-12 FR-05)', () => {
  it('injects the configured resume command', async () => {
    expect(await resetPastDeadline(delegatedConfig({ resumeCommand: '/sdd-orchestrate-flow' }))).toEqual({ kind: 'context', block: RESUME_BLOCK });
  });
  it('stays neutral without a resume command', async () => {
    expect(await resetPastDeadline(delegatedConfig())).toEqual({ kind: 'neutral' });
  });
  it('stays neutral with the default snapshot section (prd-12 FR-06)', async () => {
    expect(await resetPastDeadline(DEFAULT_CONFIG)).toEqual({ kind: 'neutral' });
  });
});
