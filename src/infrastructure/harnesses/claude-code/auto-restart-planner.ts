import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { HarnessContext } from '../../../core/contracts/adapter.js';
import type { PlannedChange, PlanConflict } from '../../../core/contracts/changes.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { pathExists } from '../common/path-helpers.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';
import { hooksManifestText, MOD_FILES, MOD_HOOKS_FILE, MOD_MANIFEST_FILE, MOD_MARKETPLACE_FILE, MOD_MODULE_FILE, MOD_ROOT, marketplaceText, pluginManifestText } from './auto-restart-files.js';
import { isLocalSettingsOwned, ownershipRecord, ownershipRemoval } from './auto-restart-ownership.js';
import { hasModKeys, isEmptySettings, withModKeys, withoutModKeys } from './auto-restart-settings.js';
import { CLAUDE_LOCAL_SETTINGS_FILE, readSettings } from './statusline-settings.js';

export type AutoRestartPlan = { readonly changes: readonly PlannedChange[]; readonly conflicts: readonly PlanConflict[] };

const EMPTY_SETTINGS_TEXT = '{\n}\n';

async function installChanges(root: string): Promise<PlannedChange[]> {
  const contents: Readonly<Record<string, string>> = {
    [MOD_MARKETPLACE_FILE]: marketplaceText(), [MOD_MANIFEST_FILE]: pluginManifestText(),
    [MOD_HOOKS_FILE]: hooksManifestText(), [MOD_MODULE_FILE]: await loadRuntimeAsset('claude-code-mod.mjs'),
  };
  return Promise.all(MOD_FILES.map(async (path) => ({
    path, realPath: await resolveChangeTarget(root, path), kind: 'create' as const, owner: 'runtime_asset' as const,
    content: contents[path] ?? '', preview: { summary: 'Install the automatic restart mod' },
  })));
}

async function isModified(context: HarnessContext, path: string): Promise<boolean> {
  const recorded = context.manifest?.assets.find((asset) => asset.path === path);
  if (recorded === undefined) return false;
  const current = createHash('sha256').update(await readFile(resolve(context.projectRoot, path))).digest('hex');
  return current !== recorded.sha256;
}

async function deletion(root: string, path: string): Promise<PlannedChange> {
  return { path, realPath: await resolveChangeTarget(root, path), kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete the automatic restart mod' } };
}

async function removalChanges(context: HarnessContext): Promise<AutoRestartPlan> {
  const present = await Promise.all(MOD_FILES.map(async (path) => ((await pathExists(resolve(context.projectRoot, path))) ? path : undefined)));
  const paths = present.filter((path): path is string => path !== undefined);
  const modified = await Promise.all(paths.map((path) => isModified(context, path)));
  const conflicts = paths.filter((_path, index) => modified[index]).map((path) => ({ path, code: 'MODIFIED_OWNED_ASSET', detail: 'Asset was modified since installation and will not be removed' }));
  const removable = paths.filter((_path, index) => !modified[index]);
  return { changes: await Promise.all(removable.map((path) => deletion(context.projectRoot, path))), conflicts };
}

type SettingsBase = { readonly text: string; readonly existing: PlannedChange | undefined; readonly isNew: boolean; readonly owned: boolean };

async function settingsBase(root: string, base: readonly PlannedChange[]): Promise<SettingsBase | PlanConflict> {
  const existing = base.find((change) => change.path === CLAUDE_LOCAL_SETTINGS_FILE);
  if (existing?.content !== undefined && existing.content !== null) return { text: existing.content, existing, isNew: false, owned: await isLocalSettingsOwned(root) };
  const read = await readSettings(resolve(root, CLAUDE_LOCAL_SETTINGS_FILE));
  if (read.kind === 'invalid') return { path: CLAUDE_LOCAL_SETTINGS_FILE, code: 'INVALID_HARNESS_CONFIG', detail: read.detail };
  return { text: read.kind === 'valid' ? read.text : EMPTY_SETTINGS_TEXT, existing, isNew: read.kind === 'absent', owned: await isLocalSettingsOwned(root) };
}

async function settingsChange(root: string, base: SettingsBase, wanted: boolean): Promise<PlannedChange | undefined> {
  if (!wanted && !hasModKeys(base.text)) return undefined;
  const text = wanted ? withModKeys(base.text, resolve(await realpath(root), MOD_ROOT)) : withoutModKeys(base.text);
  if (text === base.text && base.existing === undefined) return undefined;
  const drop = !wanted && base.owned && isEmptySettings(text);
  const summary = wanted ? 'Register the automatic restart mod' : 'Unregister the automatic restart mod';
  const kind = drop ? 'delete' : base.existing?.kind ?? (base.isNew ? 'create' : 'update');
  return { path: CLAUDE_LOCAL_SETTINGS_FILE, realPath: await resolveChangeTarget(root, CLAUDE_LOCAL_SETTINGS_FILE), kind, owner: 'harness_entry', content: drop ? null : text, preview: drop ? { summary: 'Delete the local settings left empty' } : base.existing?.preview ?? { summary } };
}

async function fileChanges(context: HarnessContext, wanted: boolean, deleteFiles: boolean): Promise<AutoRestartPlan> {
  if (wanted) return { changes: [...await installChanges(context.projectRoot), await ownershipRecord(context.projectRoot)], conflicts: [] };
  const removal = deleteFiles ? await removalChanges(context) : { changes: [], conflicts: [] };
  return { changes: [...removal.changes, ...await ownershipRemoval(context.projectRoot)], conflicts: removal.conflicts };
}

function isLocalSettingsDeletion(change: PlannedChange): boolean {
  return change.path === CLAUDE_LOCAL_SETTINGS_FILE && change.kind === 'delete';
}

export async function planAutoRestart(context: HarnessContext, base: readonly PlannedChange[], deleteFiles = true): Promise<AutoRestartPlan> {
  const wanted = context.autoRestart === true;
  const files = await fileChanges(context, wanted, deleteFiles);
  const deletesLocal = base.some(isLocalSettingsDeletion);
  if (deletesLocal && !wanted) return { changes: [...base, ...files.changes], conflicts: files.conflicts };
  const settings = deletesLocal ? { text: EMPTY_SETTINGS_TEXT, existing: undefined, isNew: false, owned: true } : await settingsBase(context.projectRoot, base);
  if ('code' in settings) return { changes: [...base, ...files.changes], conflicts: wanted ? [...files.conflicts, settings] : files.conflicts };
  const change = await settingsChange(context.projectRoot, settings, wanted);
  const kept = base.filter((candidate) => candidate.path !== CLAUDE_LOCAL_SETTINGS_FILE || change === undefined);
  return { changes: [...kept, ...(change ? [change] : []), ...files.changes], conflicts: files.conflicts };
}
