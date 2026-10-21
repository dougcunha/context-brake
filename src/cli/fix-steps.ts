import type { ChangePlan } from '../core/contracts/changes.js';
import type { DoctorReport } from '../core/contracts/diagnostics.js';
import type { FixReport, FixStop } from '../core/contracts/fix-report.js';
import { buildFixReport, findingKey, problemsOf, type FixRun } from '../core/services/fix-outcomes.js';
import { NodeChangeApplier } from '../infrastructure/storage/change-applier.js';
import { diagnoseDoctor, type DoctorDiagnosis } from './doctor-diagnosis.js';
import { EXIT_CODES } from './exit-codes.js';
import type { FixDecisions } from './fix-decisions.js';
import type { CommandEnv } from './init-flow.js';
import { planInit } from './init-plan.js';
import { restartNote } from './output/harness-labels.js';

export type RunState = Pick<FixRun, 'mode' | 'stopped' | 'after' | 'plan' | 'skipped' | 'applied'>;

const INVALID_CONFIG_CODE = 'INVALID_CONTEXTBRAKE_CONFIG';
const CONFIG_UNREADABLE_REASON = 'context-brake.config.json cannot be read. Fix it first.';

function fixableProblems(report: DoctorReport): DoctorReport['findings'] {
  return problemsOf(report).filter((finding) => finding.fix !== undefined && finding.fix.group !== 'manual');
}

export function stopOf(diagnosis: DoctorDiagnosis): FixStop | null {
  if (!diagnosis.isInstalled) return 'not_installed';
  return fixableProblems(diagnosis.report).length === 0 ? 'nothing_to_fix' : null;
}

export function hasUnreadableConfig(report: DoctorReport): boolean {
  return problemsOf(report).some((finding) => finding.code === INVALID_CONFIG_CODE && finding.fix?.group === 'manual');
}

export function configSkips(report: DoctorReport): Map<string, string> {
  return new Map(fixableProblems(report).map((finding): [string, string] => [findingKey(finding), CONFIG_UNREADABLE_REASON]));
}

export function fixReport(before: DoctorReport, state: RunState): FixReport {
  return buildFixReport({ ...state, before, errorExitCode: EXIT_CODES.error, restartNote });
}

export function unplannedState(before: DoctorReport, mode: FixReport['mode']): RunState {
  return { mode, stopped: null, after: before, plan: null, skipped: new Map(), applied: [] };
}

export async function planFor(env: CommandEnv, decisions: FixDecisions): Promise<ChangePlan> {
  const request = { harness: decisions.harness, excludeHarness: [], statuslineBridge: decisions.statuslineBridge, noAutoRestart: false, overwritePaths: decisions.overwritePaths };
  return (await planInit(env, request)).result.plan;
}

export async function applyPlan(env: CommandEnv, plan: ChangePlan, decisions: FixDecisions): Promise<RunState> {
  const applied = plan.changes.length === 0 ? [] : (await new NodeChangeApplier().apply(plan)).outcomes;
  const second = await diagnoseDoctor(env, []);
  return { mode: 'applied', stopped: null, after: second.report, plan, skipped: decisions.skipped, applied };
}
