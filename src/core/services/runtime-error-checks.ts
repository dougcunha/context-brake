import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { ErrorLine } from '../contracts/session-ledger.js';
import type { HarnessLedger } from './active-sessions.js';

export const ERRORS_LOG_RELATIVE_PATH = '.context-brake/runtime/errors.jsonl';
export const RUNTIME_ERROR_WINDOW_HOURS = 24;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const ERRORS_IMPACT = 'Telemetry can fall back to the last recorded zone until the runtime failure is fixed.';
const ERRORS_REMEDIATION = `Inspect ${ERRORS_LOG_RELATIVE_PATH} and fix the reported failures.`;

export type RuntimeStateReading = {
  readonly errors: readonly ErrorLine[];
  readonly ledgers?: readonly HarnessLedger[] | undefined;
};

export function selectRecentErrors(errors: readonly ErrorLine[], now: Date): ErrorLine[] {
  const cutoff = now.getTime() - RUNTIME_ERROR_WINDOW_HOURS * MILLISECONDS_PER_HOUR;
  return errors.filter((line) => Date.parse(line.at) >= cutoff);
}

export function runtimeErrorFindings(reading: RuntimeStateReading): DiagnosticFinding[] {
  if (reading.errors.length === 0) return [];
  const count = reading.errors.length;
  const codes = [...new Set(reading.errors.map((line) => line.code))].sort();
  return [{
    code: 'RUNTIME_ERRORS_RECORDED', severity: 'warning', scope: 'project', harness: null, path: ERRORS_LOG_RELATIVE_PATH,
    message: `ContextBrake recorded ${count} runtime ${count === 1 ? 'error' : 'errors'} in the last 24 hours (codes: ${codes.join(', ')}).`,
    impact: ERRORS_IMPACT, remediation: ERRORS_REMEDIATION,
  }];
}
