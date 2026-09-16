import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { HarnessId } from '../contracts/harness.js';
import type { BlockLine, ErrorLine, SessionLine } from '../contracts/session-ledger.js';

export const BLOCKS_LOG_RELATIVE_PATH = '.context-brake/runtime/blocks.jsonl';
export const ERRORS_LOG_RELATIVE_PATH = '.context-brake/runtime/errors.jsonl';
export const COOPERATIVE_SESSION_ID_LIMIT = 5;
export const RUNTIME_ERROR_WINDOW_HOURS = 24;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const COOPERATIVE_REMEDIATION = 'Use a harness with an enforced brake for guaranteed blocking, or treat zone limits as advisory for this harness.';
const ERRORS_IMPACT = 'The brake can fall back to the last recorded zone until the runtime failure is fixed.';
const ERRORS_REMEDIATION = `Inspect ${ERRORS_LOG_RELATIVE_PATH} and fix the reported failures.`;

export type RuntimeStateReading = {
  readonly sessions: readonly SessionLine[];
  readonly blocks: readonly BlockLine[];
  readonly errors: readonly ErrorLine[];
};

export function selectRecentErrors(errors: readonly ErrorLine[], now: Date): ErrorLine[] {
  const cutoff = now.getTime() - RUNTIME_ERROR_WINDOW_HOURS * MILLISECONDS_PER_HOUR;
  return errors.filter((line) => Date.parse(line.at) >= cutoff);
}

export function brakeSessionFindings(reading: RuntimeStateReading): DiagnosticFinding[] {
  return [...cooperativeFindings(reading.sessions), blocksFinding(reading.blocks), ...errorsFindings(reading.errors)];
}

function cooperativeFindings(sessions: readonly SessionLine[]): DiagnosticFinding[] {
  const byHarness = new Map<HarnessId, SessionLine[]>();
  for (const line of sessions) {
    if (line.brakeMode !== 'cooperative') continue;
    byHarness.set(line.harness, [...(byHarness.get(line.harness) ?? []), line]);
  }
  return [...byHarness].map(([harness, lines]) => cooperativeFinding(harness, lines));
}

function cooperativeFinding(harness: HarnessId, lines: readonly SessionLine[]): DiagnosticFinding {
  const recent = [...lines].sort((a, b) => b.at.localeCompare(a.at)).slice(0, COOPERATIVE_SESSION_ID_LIMIT);
  const sessionIds = recent.map((line) => line.sessionId).join(', ');
  return {
    code: 'BRAKE_COOPERATIVE', severity: 'warning', scope: 'harness', harness, path: null,
    message: `The ${harness} brake is cooperative; recent session IDs: ${sessionIds}.`,
    impact: recent[0]?.brakeReason ?? null,
    remediation: COOPERATIVE_REMEDIATION,
  };
}

function blocksFinding(blocks: readonly BlockLine[]): DiagnosticFinding {
  return {
    code: 'BRAKE_BLOCKS_RECORDED', severity: 'ok', scope: 'project', harness: null, path: BLOCKS_LOG_RELATIVE_PATH,
    message: `ContextBrake recorded ${blocks.length} blocked tool ${pluralize(blocks.length, 'call', 'calls')} in ${BLOCKS_LOG_RELATIVE_PATH}.`,
    impact: null, remediation: null,
  };
}

function errorsFindings(errors: readonly ErrorLine[]): DiagnosticFinding[] {
  if (errors.length === 0) return [];
  const codes = [...new Set(errors.map((line) => line.code))].sort();
  return [{
    code: 'RUNTIME_ERRORS_RECORDED', severity: 'warning', scope: 'project', harness: null, path: ERRORS_LOG_RELATIVE_PATH,
    message: `ContextBrake recorded ${errors.length} runtime ${pluralize(errors.length, 'error', 'errors')} in the last 24 hours (codes: ${codes.join(', ')}).`,
    impact: ERRORS_IMPACT, remediation: ERRORS_REMEDIATION,
  }];
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
