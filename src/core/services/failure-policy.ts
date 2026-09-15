import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../contracts/configuration.js';
import type { HarnessId } from '../contracts/harness.js';
import type { RuntimeDecision, RuntimeEvent } from '../contracts/runtime.js';
import type { RuntimeErrorCode, RuntimeErrorLog, SessionLedger } from '../contracts/session-ledger.js';
import type { SessionKey } from '../contracts/runtime.js';
import type { Zone } from '../contracts/zones.js';
import { InvalidConfigurationError } from '../validation/configuration-validator.js';
import { isToolCallAllowed } from './brake-allowlist.js';
import { renderFailureBlockMessage } from './block-message.js';
import { summarizeLedger } from './session-counters.js';

export const INTERNAL_DEADLINE_MILLISECONDS = 1500;

export class DeadlineExceededError extends Error {
  constructor() { super('The internal deadline elapsed.'); this.name = 'DeadlineExceededError'; }
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
  readonly ledger: SessionLedger;
  readonly errors: RuntimeErrorLog;
  readonly readValidationCommand: () => Promise<string | null>;
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
  await recordRuntimeFailure(input.errors, { harness: input.event.session.harness, event: input.event.kind, code: input.code, detail: input.detail });
  if (input.event.kind !== 'pre_tool') return { kind: 'neutral' };
  if ((await lastRecordedZone(input.ledger, input.event.session)) !== 'CRITICAL') return { kind: 'neutral' };
  const config = input.config ?? DEFAULT_CONFIG;
  const validationCommand = input.event.tool.category === 'shell' ? await readTolerantly(input.readValidationCommand) : null;
  if (isToolCallAllowed(input.event.tool, { config, validationCommand })) return { kind: 'neutral' };
  return { kind: 'deny', tool: input.event.tool.name, reason: 'integration_failure', message: renderFailureBlockMessage({ tool: input.event.tool.name, config }) };
}
export type RuntimeFailureRecord = { readonly harness: HarnessId; readonly event: string; readonly code: RuntimeErrorCode; readonly detail: string };
export async function recordRuntimeFailure(errors: RuntimeErrorLog, record: RuntimeFailureRecord): Promise<void> {
  try {
    await errors.append(record.harness, { event: record.event, code: record.code, detail: record.detail });
  } catch {
    return;
  }
}
async function lastRecordedZone(ledger: SessionLedger, session: SessionKey): Promise<Zone | null> {
  try {
    return summarizeLedger(await ledger.readLines(session)).lastZone;
  } catch {
    return null;
  }
}
async function readTolerantly(reader: () => Promise<string | null>): Promise<string | null> {
  try {
    return await reader();
  } catch {
    return null;
  }
}
