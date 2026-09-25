import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../core/contracts/runtime.js';
import type { Clock, LedgerLine, ResetReason, SessionLedger, SessionLineInput, ToolLineInput } from '../../core/contracts/session-ledger.js';
import type { RuntimeInput } from '../../core/services/brake-engine.js';
import { failureDetail, failureErrorCode, resolveFailure, runWithinDeadline } from '../../core/services/failure-policy.js';
import { NodeSessionLedger } from './node-session-ledger.js';
import { composeRuntime, systemClock, type RuntimeServices } from './runtime-composition.js';
import { sessionLedgerHash } from './runtime-paths.js';

export type InProcessRuntimeInput = {
  readonly projectRoot: string;
  readonly descriptor: RuntimeDescriptor;
  readonly config: ContextBrakeConfig;
  readonly clock?: Clock | undefined;
};
export type InProcessRuntime = {
  readonly handle: (event: RuntimeEvent, input?: RuntimeInput) => Promise<RuntimeDecision>;
};

export function createInProcessRuntime(input: InProcessRuntimeInput): InProcessRuntime {
  const clock = input.clock ?? systemClock;
  const ledger = new CachedSessionLedger(new NodeSessionLedger(input.projectRoot, clock), clock);
  const services = composeRuntime({ projectRoot: input.projectRoot, descriptor: input.descriptor, config: input.config, clock, ledger });
  return {
    async handle(event, engineInput) {
      try {
        if (event.kind === 'session_reset') ledger.invalidate(event.session);
        return await runWithinDeadline(services.engine.handle(event, engineInput ?? {}));
      } catch (error) {
        return handleFailure({ event, error, config: input.config, descriptor: input.descriptor, services, ledger });
      }
    },
  };
}
async function handleFailure(input: { event: RuntimeEvent; error: unknown; config: ContextBrakeConfig; descriptor: RuntimeDescriptor; services: RuntimeServices; ledger: SessionLedger }): Promise<RuntimeDecision> {
  try {
    return await resolveFailure({ event: input.event, code: failureErrorCode(input.error), detail: failureDetail(input.error), config: input.config, descriptor: input.descriptor, ledger: input.ledger, errors: input.services.errors, readValidationCommand: input.services.readValidationCommand, planPresence: input.services.planPresence });
  } catch {
    return { kind: 'neutral' };
  }
}

class CachedSessionLedger implements SessionLedger {
  private readonly cache = new Map<string, LedgerLine[]>();

  constructor(private readonly inner: SessionLedger, private readonly clock: Clock) {}

  async readLines(key: SessionKey): Promise<readonly LedgerLine[]> {
    const cached = this.cache.get(entryKey(key));
    if (cached !== undefined) return cached;
    const lines = [...await this.inner.readLines(key)];
    this.cache.set(entryKey(key), lines);
    return lines;
  }
  async appendSessionLine(key: SessionKey, input: SessionLineInput): Promise<void> {
    await this.inner.appendSessionLine(key, input);
    this.cache.get(entryKey(key))?.push({ v: 1, type: 'session', at: this.clock.now().toISOString(), harness: key.harness, sessionId: key.sessionId, agentId: key.agentId, ...input });
  }
  async appendToolLine(key: SessionKey, input: ToolLineInput): Promise<void> {
    await this.inner.appendToolLine(key, input);
    this.cache.get(entryKey(key))?.push({ v: 1, type: 'tool', at: this.clock.now().toISOString(), ...input });
  }
  async appendResetLine(key: SessionKey, reason: ResetReason): Promise<void> {
    await this.inner.appendResetLine(key, reason);
    this.cache.get(entryKey(key))?.push({ v: 1, type: 'reset', at: this.clock.now().toISOString(), reason });
  }
  async pruneStaleSessions(): Promise<number> {
    const pruned = await this.inner.pruneStaleSessions();
    this.cache.clear();
    return pruned;
  }
  invalidate(key: SessionKey): void {
    this.cache.delete(entryKey(key));
  }
}
function entryKey(key: SessionKey): string {
  return `${key.harness}\0${sessionLedgerHash(key)}`;
}
