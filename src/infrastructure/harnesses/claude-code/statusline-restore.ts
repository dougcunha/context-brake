import { resolve } from 'node:path';
import type { PlannedChange, PlanConflict } from '../../../core/contracts/changes.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import { removeJsonProperty, setJsonProperty } from '../../storage/json-document-editor.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { CLAUDE_LOCAL_SETTINGS_FILE, isBridgeStatusline, readSettings, STATUSLINE_KEY } from './statusline-settings.js';
import { readStatuslineState, STATUSLINE_STATE_FILE, type StatuslineState } from './statusline-state.js';

const INVALID_CONFIG_CODE = 'INVALID_HARNESS_CONFIG';
const EMPTY_OBJECT = '{}';

export type StatuslinePlan = { readonly changes: readonly PlannedChange[]; readonly conflicts: readonly PlanConflict[]; readonly findings: readonly DiagnosticFinding[] };

export function statuslinePlanConflict(path: string, detail: string, code: string = INVALID_CONFIG_CODE): StatuslinePlan {
  return { changes: [], conflicts: [{ path, code, detail }], findings: [] };
}

export async function planStatuslineRestore(projectRoot: string): Promise<StatuslinePlan> {
  const state = await readStatuslineState(projectRoot);
  if (state === null) return { changes: [], conflicts: [], findings: [] };
  const local = await readSettings(resolve(projectRoot, CLAUDE_LOCAL_SETTINGS_FILE));
  if (local.kind === 'invalid') return statuslinePlanConflict(CLAUDE_LOCAL_SETTINGS_FILE, local.detail);
  const stateDeletion: PlannedChange = { path: STATUSLINE_STATE_FILE, realPath: await resolveChangeTarget(projectRoot, STATUSLINE_STATE_FILE), kind: 'delete', owner: 'harness_entry', content: null, preview: { summary: 'Delete the status line bridge state' } };
  if (local.kind !== 'valid' || !isBridgeStatusline(local.statusLine)) return { changes: [stateDeletion], conflicts: [], findings: [] };
  return { changes: [await localRestoration(projectRoot, local.text, state), stateDeletion], conflicts: [], findings: [] };
}

async function localRestoration(projectRoot: string, text: string, state: StatuslineState): Promise<PlannedChange> {
  const realPath = await resolveChangeTarget(projectRoot, CLAUDE_LOCAL_SETTINGS_FILE);
  const restored = state.previousLocal === null ? removeJsonProperty(text, [STATUSLINE_KEY]) : setJsonProperty(text, [STATUSLINE_KEY], state.previousLocal);
  if (state.createdLocalFile && restored.replace(/\s/g, '') === EMPTY_OBJECT) {
    return { path: CLAUDE_LOCAL_SETTINGS_FILE, realPath, kind: 'delete', owner: 'harness_entry', content: null, preview: { summary: 'Delete the local settings the status line bridge created' } };
  }
  const summary = state.previousLocal === null ? 'Remove the status line bridge from the local settings' : 'Restore the previous local status line';
  return { path: CLAUDE_LOCAL_SETTINGS_FILE, realPath, kind: 'update', owner: 'harness_entry', content: restored, preview: { summary } };
}
