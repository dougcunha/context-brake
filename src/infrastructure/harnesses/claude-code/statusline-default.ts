import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PlanConflict, PlannedChange } from '../../../core/contracts/changes.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { planStatuslineRestore, type StatuslinePlan } from './statusline-restore.js';

export const STATUSLINE_OPT_OUT_FILE = '.context-brake/runtime/claude-statusline-opt-out.json';
const OPT_OUT_CONTENT = `${JSON.stringify({ v: 1, optedOut: true }, null, 2)}\n`;
const UNSUPPORTED_PATH_CODE = 'STATUSLINE_UNSUPPORTED_PATH';
const SETTINGS_INVALID_CODE = 'STATUSLINE_SETTINGS_INVALID';

export async function hasStatuslineOptOut(projectRoot: string): Promise<boolean> {
  return access(resolve(projectRoot, STATUSLINE_OPT_OUT_FILE)).then(() => true, () => false);
}
export async function planStatuslineOptOut(projectRoot: string): Promise<StatuslinePlan> {
  const plan = await planStatuslineRestore(projectRoot);
  if (plan.conflicts.length > 0 || (await hasStatuslineOptOut(projectRoot))) return plan;
  const record: PlannedChange = { path: STATUSLINE_OPT_OUT_FILE, realPath: await resolveChangeTarget(projectRoot, STATUSLINE_OPT_OUT_FILE), kind: 'create', owner: 'harness_entry', content: OPT_OUT_CONTENT, preview: { summary: 'Remember that the status line bridge was turned off' } };
  return { ...plan, changes: [...plan.changes, record] };
}
export async function clearStatuslineOptOut(projectRoot: string, plan: StatuslinePlan): Promise<StatuslinePlan> {
  if (plan.conflicts.length > 0 || !(await hasStatuslineOptOut(projectRoot))) return plan;
  const deletion: PlannedChange = { path: STATUSLINE_OPT_OUT_FILE, realPath: await resolveChangeTarget(projectRoot, STATUSLINE_OPT_OUT_FILE), kind: 'delete', owner: 'harness_entry', content: null, preview: { summary: 'Forget the status line bridge opt-out' } };
  return { ...plan, changes: [...plan.changes, deletion] };
}
export function softenDefaultConflict(plan: StatuslinePlan): StatuslinePlan {
  if (plan.conflicts.length === 0) return plan;
  return { changes: [], conflicts: [], findings: [...plan.findings, ...plan.conflicts.map(conflictFinding)] };
}
function conflictFinding(conflict: PlanConflict): DiagnosticFinding {
  const isUnsupportedPath = conflict.code === UNSUPPORTED_PATH_CODE;
  return {
    code: isUnsupportedPath ? UNSUPPORTED_PATH_CODE : SETTINGS_INVALID_CODE, severity: 'warning', scope: 'file', harness: 'claude-code', path: conflict.path,
    message: isUnsupportedPath ? conflict.detail : `${conflict.path} could not be parsed, so the status line bridge was not installed or updated: ${conflict.detail}`,
    impact: 'The status line bridge was not installed, so the brake only warns in Claude Code.',
    remediation: isUnsupportedPath ? 'Move the repository to a path without ", `, $, or \\, then run context-brake init.' : `Fix ${conflict.path}, then run context-brake init.`,
  };
}
