import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../../core/contracts/runtime.js';
import { failureDetail, failureErrorCode, recordRuntimeFailure, resolveFailure } from '../../core/services/failure-policy.js';
import { deadlineTiming } from './hook-deadline.js';
import { createRuntimePorts, systemClock } from './runtime-composition.js';

export type HookState = { event: RuntimeEvent | null; projectRoot: string | null; config: ContextBrakeConfig | null };
export type HookFailure = { readonly descriptor: RuntimeDescriptor; readonly state: HookState; readonly error: unknown; readonly eventName: string };

const NEUTRAL: RuntimeDecision = { kind: 'neutral' };

export async function failureDecision(input: HookFailure): Promise<RuntimeDecision> {
  if (input.state.projectRoot === null) return NEUTRAL;
  const ports = createRuntimePorts({ projectRoot: input.state.projectRoot, config: input.state.config, clock: systemClock });
  const code = failureErrorCode(input.error);
  const detail = failureDetail(input.error);
  const timing = deadlineTiming(input.error);
  if (input.state.event === null) {
    await recordRuntimeFailure(ports.errors, { harness: input.descriptor.harness, event: input.eventName, code, detail, ...timing });
    return NEUTRAL;
  }
  try {
    return await resolveFailure({ event: input.state.event, code, detail, timing, config: input.state.config, descriptor: input.descriptor, ledger: ports.ledger, errors: ports.errors });
  } catch {
    return NEUTRAL;
  }
}
