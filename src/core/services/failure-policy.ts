import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../contracts/configuration.js';
import type { HarnessId } from '../contracts/harness.js';
import type { HookPhase, PhaseTiming } from '../contracts/hook-phase.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../contracts/runtime.js';
import type { RuntimeErrorCode, RuntimeErrorLog, SessionLedger } from '../contracts/session-ledger.js';
import { InvalidConfigurationError } from '../validation/configuration-validator.js';
import { resumeText } from './zone-guidance.js';

export const INTERNAL_DEADLINE_MILLISECONDS = 1500;

export class DeadlineExceededError extends Error {
  constructor(readonly phase?: HookPhase, readonly elapsedMs?: number) { super('The internal deadline elapsed.'); this.name = 'DeadlineExceededError'; }
}
export class LedgerUnreadableError extends Error {
  constructor(options?: ErrorOptions) { super('The session ledger could not be read.', options); this.name = 'LedgerUnreadableError'; }
}
export class PayloadInvalidError extends Error {
  constructor(options?: ErrorOptions) { super('The harness payload is invalid.', options); this.name = 'PayloadInvalidError'; }
}

export type FailureResolutionInput = {
  readonly event: RuntimeEvent;
  readonly code: RuntimeErrorCode;
  readonly detail: string;
  readonly config: ContextBrakeConfig | null;
  readonly descriptor: RuntimeDescriptor | null;
  readonly ledger: SessionLedger;
  readonly errors: RuntimeErrorLog;
  readonly timing?: PhaseTiming | undefined;
};

export function failureErrorCode(error: unknown): RuntimeErrorCode {
  if (error instanceof DeadlineExceededError) return 'DEADLINE_EXCEEDED';
  if (error instanceof LedgerUnreadableError) return 'LEDGER_UNREADABLE';
  if (error instanceof PayloadInvalidError) return 'PAYLOAD_INVALID';
  if (error instanceof InvalidConfigurationError) return 'INVALID_CONFIG';
  return 'UNEXPECTED';
}
export function failureDetail(error: unknown): string {
  if (error instanceof InvalidConfigurationError) return error.issues[0] ? `InvalidConfigurationError ${error.issues[0].path}` : 'InvalidConfigurationError';
  return error instanceof Error ? error.constructor.name : 'UnexpectedError';
}
export function runWithinDeadline<T>(work: Promise<T>, deadlineMilliseconds = INTERNAL_DEADLINE_MILLISECONDS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new DeadlineExceededError()), deadlineMilliseconds);
    work.then((value) => { clearTimeout(timer); resolve(value); }, (error: unknown) => { clearTimeout(timer); reject(error); });
  });
}
export async function resolveFailure(input: FailureResolutionInput): Promise<RuntimeDecision> {
  await recordRuntimeFailure(input.errors, { harness: input.event.session.harness, event: input.event.kind, code: input.code, detail: input.detail, ...input.timing });
  if (input.event.kind === 'session_reset' && input.code === 'DEADLINE_EXCEEDED' && sessionBootSupported(input.descriptor)) return deadlineBootDecision(input);
  return { kind: 'neutral' };
}
function deadlineBootDecision(input: FailureResolutionInput): RuntimeDecision {
  const text = resumeText((input.config ?? DEFAULT_CONFIG).snapshot);
  return text === null ? { kind: 'neutral' } : { kind: 'context', block: text };
}
export type RuntimeFailureRecord = PhaseTiming & { readonly harness: HarnessId; readonly event: string; readonly code: RuntimeErrorCode; readonly detail: string };
export async function recordRuntimeFailure(errors: RuntimeErrorLog, record: RuntimeFailureRecord): Promise<void> {
  try {
    await errors.append(record.harness, { event: record.event, code: record.code, detail: record.detail, phase: record.phase, elapsedMs: record.elapsedMs });
  } catch {
    return;
  }
}
function sessionBootSupported(descriptor: RuntimeDescriptor | null): boolean {
  return descriptor?.capabilities.some((entry) => entry.id === 'session_boot' && entry.state === 'supported') ?? false;
}
