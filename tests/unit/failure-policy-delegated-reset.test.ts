import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { PlanPresence } from '../../src/core/contracts/checkpoint-mode.js';
import type { RuntimeErrorLog } from '../../src/core/contracts/session-ledger.js';
import { renderBootOmission } from '../../src/core/services/boot-summary.js';
import { resolveFailure } from '../../src/core/services/failure-policy.js';
import { CountingPresence, DELEGATED_DESCRIPTOR, DELEGATED_KEY, delegatedConfig, FailingPresence, MemoryLedger } from '../helpers/delegated-fixtures.js';

const RESUME_BLOCK = '[ContextBrake boot v1] Run "/sdd-orchestrate-flow" before continuing.';
const OMISSION = { kind: 'context', block: renderBootOmission() };
const errors: RuntimeErrorLog = { append: async () => undefined };
function resetPastDeadline(config: ContextBrakeConfig, planPresence: PlanPresence) {
  return resolveFailure({ event: { kind: 'session_reset', session: DELEGATED_KEY, reason: 'new' }, code: 'DEADLINE_EXCEEDED', detail: 'DeadlineExceededError', config, descriptor: DELEGATED_DESCRIPTOR, ledger: new MemoryLedger(), errors, readValidationCommand: async () => null, planPresence });
}

describe('session reset past the deadline in delegated mode (codereview_1/CR-01, FR-08, DEC-06)', () => {
  it('injects the resume command when the plan file is missing', async () => {
    expect(await resetPastDeadline(delegatedConfig({ resumeCommand: '/sdd-orchestrate-flow' }), new CountingPresence(false))).toEqual({ kind: 'context', block: RESUME_BLOCK });
  });
  it('stays neutral without a resume command', async () => {
    expect(await resetPastDeadline(delegatedConfig(), new CountingPresence(false))).toEqual({ kind: 'neutral' });
  });
  it('uses the delegated text when the plan file cannot be checked', async () => {
    expect(await resetPastDeadline(delegatedConfig({ resumeCommand: '/sdd-orchestrate-flow' }), new FailingPresence())).toEqual({ kind: 'context', block: RESUME_BLOCK });
  });
});

describe('session reset past the deadline in plan mode (codereview_1/CR-01, NFR-01)', () => {
  it('keeps the boot omission while the plan file exists', async () => {
    expect(await resetPastDeadline(delegatedConfig({ resumeCommand: '/sdd-orchestrate-flow' }), new CountingPresence(true))).toEqual(OMISSION);
  });
  it('keeps the boot omission without the section and never checks the plan file', async () => {
    const presence = new CountingPresence(false);
    expect(await resetPastDeadline(DEFAULT_CONFIG, presence)).toEqual(OMISSION);
    expect(presence.calls).toBe(0);
  });
});
