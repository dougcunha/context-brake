import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../../../core/contracts/runtime.js';
import type { Clock } from '../../../core/contracts/session-ledger.js';
import type { RuntimeInput } from '../../../core/services/brake-engine.js';
import { failureDetail, failureErrorCode, resolveFailure } from '../../../core/services/failure-policy.js';
import { createInProcessRuntime, type InProcessRuntime } from '../../runtime/in-process-host.js';
import { createRuntimePorts, loadRuntimeConfiguration, systemClock } from '../../runtime/runtime-composition.js';
import { asRecord } from './runtime-support.js';

export type InProcessRuntimeResolver = (projectRoot: string) => Promise<InProcessRuntime>;

export type MeasuredUsageInput = { readonly tokens: number | null; readonly contextWindow: number };

export function createRuntimeResolver(descriptor: RuntimeDescriptor, clock: Clock = systemClock): InProcessRuntimeResolver {
  let currentRoot: string | null = null;
  let current: Promise<InProcessRuntime> | null = null;
  return (projectRoot) => {
    if (current === null || currentRoot !== projectRoot) {
      currentRoot = projectRoot;
      current = loadRuntimeConfiguration(projectRoot)
        .then((config) => createInProcessRuntime({ projectRoot, descriptor, config, clock }))
        .catch((error: unknown) => { current = null; throw error; });
    }
    return current;
  };
}

export type InProcessEventInput = {
  readonly resolver: InProcessRuntimeResolver;
  readonly projectRoot: string | null;
  readonly event: RuntimeEvent;
  readonly engineInput?: RuntimeInput | undefined;
};

export async function runInProcessEvent(input: InProcessEventInput): Promise<RuntimeDecision> {
  if (input.projectRoot === null) return { kind: 'neutral' };
  try {
    const runtime = await input.resolver(input.projectRoot);
    return await runtime.handle(input.event, input.engineInput);
  } catch (error: unknown) {
    return await resolveInProcessFailure(input.projectRoot, input.event, error);
  }
}

export function measuredUsageFrom(value: unknown): MeasuredUsageInput | undefined {
  const record = asRecord(value);
  const contextWindow = record?.['contextWindow'];
  if (typeof contextWindow !== 'number' || contextWindow <= 0) return undefined;
  const tokens = record?.['tokens'];
  return { tokens: typeof tokens === 'number' ? tokens : null, contextWindow };
}

async function resolveInProcessFailure(projectRoot: string, event: RuntimeEvent, error: unknown): Promise<RuntimeDecision> {
  const ports = createRuntimePorts({ projectRoot, config: null, clock: systemClock });
  return await resolveFailure({ event, code: failureErrorCode(error), detail: failureDetail(error), config: null, ledger: ports.ledger, errors: ports.errors, readValidationCommand: ports.readValidationCommand });
}
