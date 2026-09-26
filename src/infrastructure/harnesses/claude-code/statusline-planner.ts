import { realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { HarnessContext } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import { setJsonProperty } from '../../storage/json-document-editor.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';
import { getUserHome } from '../common/path-helpers.js';
import { asRecord } from '../common/runtime-support.js';
import { planStatuslineRestore, statuslinePlanConflict, type StatuslinePlan } from './statusline-restore.js';
import { bridgeCommand, CLAUDE_LOCAL_SETTINGS_FILE, CLAUDE_SETTINGS_FILE, firstPreviousStatusline, isBridgeStatusline, readSettings, STATUSLINE_BRIDGE_FILE, STATUSLINE_KEY, statuslineOf, statuslineOptions, toCommandRoot, type SettingsRead, type StatuslineObject } from './statusline-settings.js';
import { readStatuslineState, serializeStatuslineState, STATUSLINE_STATE_FILE, type StatuslineState } from './statusline-state.js';

const EMPTY_SETTINGS_TEXT = '{\n}\n';
const EMPTY_PLAN: StatuslinePlan = { changes: [], conflicts: [], findings: [] };

type Origin = Omit<StatuslineState, 'v' | 'installedCommand'> & { readonly options: StatuslineObject; readonly findings: readonly DiagnosticFinding[] };

export async function planStatuslineInstall(context: HarnessContext): Promise<StatuslinePlan> {
  const plan = context.statuslineBridge === 'remove' ? await planStatuslineRestore(context.projectRoot) : await planStatuslineEntry(context);
  return { ...plan, changes: [await bridgeAssetChange(context.projectRoot), ...plan.changes] };
}

export async function planStatuslineRemove(projectRoot: string): Promise<StatuslinePlan> {
  const plan = await planStatuslineRestore(projectRoot);
  const realPath = await resolveChangeTarget(projectRoot, STATUSLINE_BRIDGE_FILE);
  const deletion: PlannedChange = { path: STATUSLINE_BRIDGE_FILE, realPath, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete the status line bridge script' } };
  return { ...plan, changes: [...plan.changes, deletion] };
}

async function bridgeAssetChange(projectRoot: string): Promise<PlannedChange> {
  const realPath = await resolveChangeTarget(projectRoot, STATUSLINE_BRIDGE_FILE);
  return { path: STATUSLINE_BRIDGE_FILE, realPath, kind: 'create', owner: 'runtime_asset', content: await loadRuntimeAsset('claude-code-statusline.mjs'), preview: { summary: 'Install the status line bridge script' } };
}

async function planStatuslineEntry(context: HarnessContext): Promise<StatuslinePlan> {
  const isRequested = context.statuslineBridge === 'install';
  const state = await readStatuslineState(context.projectRoot);
  if (!isRequested && state === null) return EMPTY_PLAN;
  const local = await readSettings(resolve(context.projectRoot, CLAUDE_LOCAL_SETTINGS_FILE));
  if (local.kind === 'invalid') return statuslinePlanConflict(CLAUDE_LOCAL_SETTINGS_FILE, local.detail);
  const isInstalled = local.kind === 'valid' && isBridgeStatusline(local.statusLine);
  if (!isRequested && !isInstalled) return EMPTY_PLAN;
  if (state !== null && isInstalled) return buildEntryPlan(context.projectRoot, local, { ...state, options: statuslineOptions(local.statusLine), findings: [] });
  const origin = await resolveOrigin(context, local, state);
  return 'conflicts' in origin ? origin : buildEntryPlan(context.projectRoot, local, origin);
}

async function resolveOrigin(context: HarnessContext, local: SettingsRead, state: StatuslineState | null): Promise<Origin | StatuslinePlan> {
  const project = await readSettings(resolve(context.projectRoot, CLAUDE_SETTINGS_FILE));
  if (project.kind === 'invalid') return statuslinePlanConflict(CLAUDE_SETTINGS_FILE, project.detail);
  const user = await readSettings(join(getUserHome(context.userHome), CLAUDE_SETTINGS_FILE));
  const localValue = local.kind === 'valid' && !isBridgeStatusline(local.statusLine) ? local.statusLine : undefined;
  const previous = firstPreviousStatusline([{ source: 'local', value: localValue }, { source: 'project', value: statuslineOf(project) }, { source: 'user', value: statuslineOf(user) }]);
  const previousLocal = asRecord(localValue);
  return {
    previousLocal, previousSource: previous?.source ?? null, previousCommand: previous?.command ?? null,
    createdLocalFile: state?.createdLocalFile ?? local.kind === 'absent', options: statuslineOptions(previous?.value), findings: user.kind === 'invalid' ? [userSettingsFinding(user.detail)] : [],
  };
}

async function buildEntryPlan(projectRoot: string, local: SettingsRead, origin: Origin): Promise<StatuslinePlan> {
  const command = bridgeCommand(toCommandRoot(await realpath(projectRoot)), origin.previousCommand);
  if (command === null) return statuslinePlanConflict(CLAUDE_LOCAL_SETTINGS_FILE, 'The repository path contains ", `, $, or \\, which the status line command cannot quote safely.', 'STATUSLINE_UNSUPPORTED_PATH');
  const text = setJsonProperty(local.kind === 'valid' ? local.text : EMPTY_SETTINGS_TEXT, [STATUSLINE_KEY], { type: 'command', command, ...origin.options });
  const state: StatuslineState = { v: 1, installedCommand: command, previousLocal: origin.previousLocal, previousSource: origin.previousSource, previousCommand: origin.previousCommand, createdLocalFile: origin.createdLocalFile };
  const summary = origin.previousSource === null ? 'Install the status line bridge; no previous status line existed' : `Install the status line bridge, preserving the ${origin.previousSource} status line`;
  const changes: PlannedChange[] = [
    { path: CLAUDE_LOCAL_SETTINGS_FILE, realPath: await resolveChangeTarget(projectRoot, CLAUDE_LOCAL_SETTINGS_FILE), kind: local.kind === 'valid' ? 'update' : 'create', owner: 'harness_entry', content: text, preview: { summary } },
    { path: STATUSLINE_STATE_FILE, realPath: await resolveChangeTarget(projectRoot, STATUSLINE_STATE_FILE), kind: 'update', owner: 'harness_entry', content: serializeStatuslineState(state), preview: { summary: 'Record the status line bridge state' } },
  ];
  return { changes, conflicts: [], findings: [...origin.findings] };
}

function userSettingsFinding(detail: string): DiagnosticFinding {
  return {
    code: 'STATUSLINE_USER_SETTINGS_INVALID', severity: 'warning', scope: 'file', harness: 'claude-code', path: `~/${CLAUDE_SETTINGS_FILE}`,
    message: `User settings ~/${CLAUDE_SETTINGS_FILE} could not be parsed, so its status line was ignored: ${detail}`,
    impact: 'A status line defined only in the user settings is not shown through the bridge.', remediation: `Fix ~/${CLAUDE_SETTINGS_FILE}, then run context-brake init --statusline-bridge.`,
  };
}
