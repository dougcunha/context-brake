import type { ApplyOutcome, ChangePlan } from '../contracts/changes.js';
import type { DiagnosticFinding, DoctorReport } from '../contracts/diagnostics.js';
import type { FixOutcome } from '../contracts/fix.js';
import { fixReportSchema, type FixOutcomeItem, type FixPlanSummary, type FixReport, type FixStop } from '../contracts/fix-report.js';
import type { HarnessId } from '../contracts/harness.js';

export type FixRun = {
  readonly mode: FixReport['mode'];
  readonly stopped: FixStop | null;
  readonly before: DoctorReport;
  readonly after: DoctorReport;
  readonly plan: ChangePlan | null;
  readonly skipped: ReadonlyMap<string, string>;
  readonly applied: readonly ApplyOutcome[];
  readonly errorExitCode: FixReport['exitCode'];
  readonly restartNote: (harness: HarnessId | null) => string;
};

const RESTART_GATED_CODES: ReadonlySet<string> = new Set(['AUTO_RESTART_OUTDATED_MOD']);
const BRIDGE_DECISION_CODE = 'STATUSLINE_BRIDGE_INACTIVE';
const STATUSLINE_PREFIX = 'STATUSLINE_';
const STATUS_BY_EXIT: Record<FixReport['exitCode'], FixReport['status']> = { 0: 'healthy', 1: 'warnings', 2: 'errors' };
export const NOT_INSTALLED_REASON = 'ContextBrake is not installed in this project. Run context-brake init first.';
export const KEPT_STATUSLINE_REASON = `Skipped with ${BRIDGE_DECISION_CODE}: the status line stays as it is.`;

export function findingKey(finding: Pick<DiagnosticFinding, 'code' | 'harness' | 'path'>): string {
  return [finding.code, finding.harness ?? '', finding.path ?? ''].join('|');
}

export function problemsOf(report: DoctorReport): DiagnosticFinding[] {
  return report.findings.filter((finding) => finding.severity !== 'ok');
}

function keepsStatusline(run: FixRun, finding: DiagnosticFinding): boolean {
  if (finding.harness !== 'claude-code' || !finding.code.startsWith(STATUSLINE_PREFIX) || finding.code === BRIDGE_DECISION_CODE) return false;
  return problemsOf(run.before).some((other) => other.code === BRIDGE_DECISION_CODE && run.skipped.has(findingKey(other)));
}

function skipReason(run: FixRun, finding: DiagnosticFinding): string | null {
  if (run.stopped === 'not_installed') return NOT_INSTALLED_REASON;
  return run.skipped.get(findingKey(finding)) ?? (keepsStatusline(run, finding) ? KEPT_STATUSLINE_REASON : null);
}

function appliedResult(run: FixRun, finding: DiagnosticFinding): [FixOutcome, string | null] {
  const failure = run.applied.find((outcome) => outcome.status === 'failed' && outcome.path === finding.path);
  if (failure !== undefined) return ['failed', failure.detail];
  if (RESTART_GATED_CODES.has(finding.code)) return ['fixed', run.restartNote(finding.harness)];
  const isStillReported = problemsOf(run.after).some((other) => findingKey(other) === findingKey(finding));
  return isStillReported ? ['failed', `Still reported after the fix: ${finding.message}`] : ['fixed', null];
}

function resultOf(run: FixRun, finding: DiagnosticFinding): [FixOutcome, string | null] {
  if ((finding.fix?.group ?? 'manual') === 'manual') return ['manual', finding.remediation];
  const reason = skipReason(run, finding);
  if (reason !== null) return ['skipped', reason];
  return run.mode === 'dry_run' ? ['planned', null] : appliedResult(run, finding);
}

function outcomeItem(run: FixRun, finding: DiagnosticFinding): FixOutcomeItem {
  const [outcome, detail] = resultOf(run, finding);
  return { code: finding.code, harness: finding.harness, path: finding.path, group: finding.fix?.group ?? 'manual', outcome, detail };
}

function planSummary(plan: ChangePlan | null): FixPlanSummary {
  if (plan === null) return { changes: [], conflicts: [] };
  return { changes: plan.changes.map((change) => ({ path: change.path, kind: change.kind, owner: change.owner, summary: change.preview.summary })), conflicts: [...plan.conflicts] };
}

function exitCodeOf(run: FixRun): FixReport['exitCode'] {
  if (run.mode === 'dry_run' || run.stopped !== null) return run.before.exitCode;
  const hasFailedChange = run.applied.some((outcome) => outcome.status === 'failed');
  return hasFailedChange ? run.errorExitCode : run.after.exitCode;
}

export function buildFixReport(run: FixRun): FixReport {
  const exitCode = exitCodeOf(run);
  return fixReportSchema.parse({
    schemaVersion: 1, command: 'fix', mode: run.mode, stopped: run.stopped, status: STATUS_BY_EXIT[exitCode], exitCode,
    plan: planSummary(run.plan), outcomes: problemsOf(run.before).map((finding) => outcomeItem(run, finding)), doctor: run.after,
  });
}
