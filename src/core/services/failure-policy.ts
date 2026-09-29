import type { PlanPresence } from '../contracts/checkpoint-mode.js';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../contracts/configuration.js';
import type { HarnessId } from '../contracts/harness.js';
import type { HookPhase, PhaseTiming } from '../contracts/hook-phase.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../contracts/runtime.js';
import type { RuntimeErrorCode, RuntimeErrorLog, SessionLedger } from '../contracts/session-ledger.js';
import type { SessionKey } from '../contracts/runtime.js';
import { InvalidConfigurationError } from '../validation/configuration-validator.js';
import { renderBootOmission } from './boot-summary.js';
import { summarizeLedger } from './session-counters.js';
import { isTrustedWindow } from './window-trust.js';
import { resolveFailureGuidance, type GuidanceSources } from './zone-guidance.js';

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
  readonly readValidationCommand: () => Promise<string | null>;
  readonly planPresence?: PlanPresence | undefined;
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
  if (input.event.kind !== 'pre_tool' || input.config?.lightMode !== undefined) return { kind: 'neutral' };
  if (!(await wasTrustedCritical(input.ledger, input.event.session))) return { kind: 'neutral' };
  const guidance = await resolveFailureGuidance(guidanceSources(input));
  if (await guidance.allows(input.event.tool)) return { kind: 'neutral' };
  return { kind: 'deny', tool: input.event.tool.name, reason: 'integration_failure', message: guidance.failureMessage(input.event.tool.name) };
}
async function deadlineBootDecision(input: FailureResolutionInput): Promise<RuntimeDecision> {
  const guidance = await resolveFailureGuidance(guidanceSources(input));
  if (guidance.mode === 'plan') return { kind: 'context', block: renderBootOmission() };
  return guidance.resumeText === null ? { kind: 'neutral' } : { kind: 'context', block: guidance.resumeText };
}
function guidanceSources(input: FailureResolutionInput): GuidanceSources {
  return { config: input.config ?? DEFAULT_CONFIG, planPresence: input.planPresence, readValidationCommand: () => readTolerantly(input.readValidationCommand) };
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
async function wasTrustedCritical(ledger: SessionLedger, session: SessionKey): Promise<boolean> {
  try {
    const last = summarizeLedger(await ledger.readLines(session)).lastReading;
    return last?.zone === 'CRITICAL' && isTrustedWindow(last.windowOrigin);
  } catch {
    return false;
  }
}
async function readTolerantly(reader: () => Promise<string | null>): Promise<string | null> {
  try {
    return await reader();
  } catch {
    return null;
  }
}
