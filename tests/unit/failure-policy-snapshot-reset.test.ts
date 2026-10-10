import { describe, expect, it } from 'vitest';
import type { ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, RuntimeEvent } from '../../src/core/contracts/runtime.js';
import type { RuntimeErrorCode, RuntimeErrorLog } from '../../src/core/contracts/session-ledger.js';
import { resolveFailure } from '../../src/core/services/failure-policy.js';
import { DELEGATED_DESCRIPTOR, DELEGATED_KEY, delegatedConfig, MemoryLedger } from '../helpers/delegated-fixtures.js';

const RESUME_BLOCK = '[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.';
const RESUME_CONFIG = delegatedConfig({ resumeCommand: '/sdd-orchestrate-flow' });
const RESET: RuntimeEvent = { kind: 'session_reset', session: DELEGATED_KEY, reason: 'new' };
const BOOT_AFTER_USAGE: RuntimeDescriptor = { ...DELEGATED_DESCRIPTOR, capabilities: [{ id: 'context_usage', state: 'supported' }, { id: 'session_boot', state: 'supported' }] };
const NO_BOOT: RuntimeDescriptor = { ...DELEGATED_DESCRIPTOR, capabilities: [{ id: 'session_boot', state: 'unsupported' }, { id: 'context_usage', state: 'supported' }] };
const errors: RuntimeErrorLog = { append: async () => undefined };

type Failure = { readonly event?: RuntimeEvent; readonly code?: RuntimeErrorCode; readonly config?: ContextBrakeConfig | null; readonly descriptor?: RuntimeDescriptor | null };

function resolve(failure: Failure) {
  return resolveFailure({ event: failure.event ?? RESET, code: failure.code ?? 'DEADLINE_EXCEEDED', detail: 'DeadlineExceededError', config: failure.config === undefined ? RESUME_CONFIG : failure.config, descriptor: failure.descriptor === undefined ? DELEGATED_DESCRIPTOR : failure.descriptor, ledger: new MemoryLedger(), errors });
}

describe('session reset past the deadline (prd-12 FR-05)', () => {
  it('injects the configured resume command on a harness with session boot', async () => {
    expect(await resolve({ descriptor: BOOT_AFTER_USAGE })).toEqual({ kind: 'context', block: RESUME_BLOCK });
  });
  it.each<{ label: string; failure: Failure }>([
    { label: 'without a configuration, so without a resume command (prd-12 FR-06)', failure: { config: null } },
    { label: 'for another failure of the session reset', failure: { code: 'UNEXPECTED' } },
    { label: 'on a harness without session boot', failure: { descriptor: NO_BOOT } },
    { label: 'before the harness descriptor is known', failure: { descriptor: null } },
  ])('stays neutral $label', async ({ failure }) => {
    expect(await resolve(failure)).toEqual({ kind: 'neutral' });
  });
});
