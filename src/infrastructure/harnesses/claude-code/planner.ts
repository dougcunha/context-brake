import { resolve } from 'node:path';
import type { AdapterPlan, HarnessContext } from '../../../core/contracts/adapter.js';
import type { PlannedChange, PlanConflict } from '../../../core/contracts/changes.js';
import type { InstallationManifest, ManagedAsset, ManagedEntry } from '../../../core/contracts/manifest.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { validateRemovalConfig } from '../common/removal-config-validator.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';
import { MOD_FILES } from './auto-restart-files.js';
import { planAutoRestart } from './auto-restart-planner.js';
import { applyHooks } from './claude-hooks-config.js';
import type { ContextSource } from './context-source.js';
import { CLAUDE_HOOK_SCRIPT } from './hook-script.js';
import { claudeHooksFile, hasOwnedHooks, otherHooksFile, readRaw, settleChange, upsertLocalChange } from './hooks-file.js';
import { planStatuslineInstall, planStatuslineRemove } from './statusline-planner.js';
import { CLAUDE_LOCAL_SETTINGS_FILE, CLAUDE_SETTINGS_FILE, readSettings, STATUSLINE_BRIDGE_FILE } from './statusline-settings.js';

export const CLAUDE_CONFIG_FILE = CLAUDE_SETTINGS_FILE;
export const CLAUDE_HOOK_FILE = CLAUDE_HOOK_SCRIPT;

const EMPTY_SETTINGS_TEXT = '{\n}\n';
const MOVE_SUMMARY = 'Move Claude Code hooks out of the other settings file';

export function buildClaudeEntries(path: string = CLAUDE_CONFIG_FILE): ManagedEntry[] {
  return [
    { harness: 'claude-code', path, identity: `PostToolUse|*|${CLAUDE_HOOK_FILE}` },
    { harness: 'claude-code', path, identity: `SessionStart|startup|resume|clear|compact|${CLAUDE_HOOK_FILE}` },
    { harness: 'claude-code', path, identity: `Stop|*|${CLAUDE_HOOK_FILE}` },
  ];
}

function keptBridgeAssets(context: HarnessContext): ManagedAsset[] {
  if (context.statuslineBridge !== 'keep') return [];
  return (context.manifest?.assets ?? []).filter((asset) => asset.path === STATUSLINE_BRIDGE_FILE);
}

function invalidConfigPlan(path: string, detail: string): AdapterPlan {
  return { harness: 'claude-code', changes: [], conflicts: [{ path, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
}

type RemovalScope = { readonly root: string; readonly manifest: InstallationManifest | null | undefined; readonly summary: string };

async function removeFromSharedSettings(scope: RemovalScope, raw: string): Promise<PlannedChange> {
  const { root, manifest, summary } = scope;
  const change: PlannedChange = { path: CLAUDE_CONFIG_FILE, realPath: await resolveChangeTarget(root, CLAUDE_CONFIG_FILE), kind: 'update', owner: 'harness_entry', content: applyHooks(raw, false), preview: { summary } };
  return settleChange(root, change, manifest);
}

async function removeFromLocalSettings(scope: RemovalScope, changes: readonly PlannedChange[]): Promise<PlannedChange[]> {
  const { root, manifest, summary } = scope;
  const present = changes.find((change) => change.path === CLAUDE_LOCAL_SETTINGS_FILE)?.content ?? await readRaw(root, CLAUDE_LOCAL_SETTINGS_FILE);
  if (present === null || present === undefined || !hasOwnedHooks(present)) return [...changes];
  const edited = await upsertLocalChange(root, changes, { transform: (text) => applyHooks(text, false), summary });
  const local = edited.find((change) => change.path === CLAUDE_LOCAL_SETTINGS_FILE);
  return local === undefined ? edited : [...edited.filter((change) => change !== local), await settleChange(root, local, manifest)];
}

// Migração: tira as entradas do ContextBrake do arquivo que não é o destino do modo atual.
async function moveHooksOut(context: HarnessContext, changes: readonly PlannedChange[], other: string): Promise<PlannedChange[]> {
  if (other === CLAUDE_LOCAL_SETTINGS_FILE) return removeFromLocalSettings({ root: context.projectRoot, manifest: context.manifest, summary: MOVE_SUMMARY }, changes);
  const raw = await readRaw(context.projectRoot, CLAUDE_CONFIG_FILE);
  if (raw === null || !hasOwnedHooks(raw)) return [...changes];
  return [...changes, await removeFromSharedSettings({ root: context.projectRoot, manifest: context.manifest, summary: MOVE_SUMMARY }, raw)];
}

export async function planClaudeInstall(context: HarnessContext, source: ContextSource = 'bridge'): Promise<AdapterPlan> {
  const projectRoot = context.projectRoot;
  const target = claudeHooksFile(context);
  const read = await readSettings(resolve(projectRoot, target));
  if (read.kind === 'invalid') return invalidConfigPlan(target, read.detail);
  let updated: string;
  try {
    updated = applyHooks(read.kind === 'valid' ? read.text : EMPTY_SETTINGS_TEXT, true);
  } catch (error: unknown) {
    return invalidConfigPlan(target, error instanceof Error ? error.message : String(error));
  }
  const assetContent = await loadRuntimeAsset('claude-code-hook.mjs');
  const statusline = await planStatuslineInstall(context, source);
  const shared: PlannedChange[] = target === CLAUDE_CONFIG_FILE
    ? [{ path: CLAUDE_CONFIG_FILE, realPath: await resolveChangeTarget(projectRoot, CLAUDE_CONFIG_FILE), kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Register Claude Code hooks' } }]
    : [];
  const base: PlannedChange[] = [
    ...shared,
    { path: CLAUDE_HOOK_FILE, realPath: await resolveChangeTarget(projectRoot, CLAUDE_HOOK_FILE), kind: 'create', owner: 'runtime_asset', content: assetContent, preview: { summary: 'Install ContextBrake hook script' } },
    ...statusline.changes,
  ];
  const registered = target === CLAUDE_LOCAL_SETTINGS_FILE ? await upsertLocalChange(projectRoot, base, { transform: (text) => applyHooks(text, true), summary: 'Register Claude Code hooks' }) : base;
  const changes = await moveHooksOut(context, registered, otherHooksFile(target));
  const autoRestart = await planAutoRestart(context, changes, { forModFirst: source === 'mod' });
  return { harness: 'claude-code', changes: [...autoRestart.changes], conflicts: [...statusline.conflicts, ...autoRestart.conflicts], entries: buildClaudeEntries(target), findings: statusline.findings, assets: keptBridgeAssets(context) };
}

export async function planClaudeRemove(projectRoot: string, manifest: InstallationManifest | null = null): Promise<AdapterPlan> {
  const sharedRaw = await readRaw(projectRoot, CLAUDE_CONFIG_FILE);
  const localRaw = await readRaw(projectRoot, CLAUDE_LOCAL_SETTINGS_FILE);
  const localOwnsHooks = localRaw?.includes(CLAUDE_HOOK_FILE) === true;
  const conflicts = [validateRemovalConfig(sharedRaw, CLAUDE_CONFIG_FILE), localOwnsHooks ? validateRemovalConfig(localRaw, CLAUDE_LOCAL_SETTINGS_FILE) : null].filter((conflict): conflict is PlanConflict => conflict !== null);
  if (conflicts.length > 0) {
    return { harness: 'claude-code', changes: [], conflicts, entries: buildClaudeEntries(), assetPaths: [CLAUDE_HOOK_FILE, STATUSLINE_BRIDGE_FILE] };
  }
  const changes: PlannedChange[] = [];
  if (sharedRaw !== null) changes.push(await removeFromSharedSettings({ root: projectRoot, manifest, summary: 'Remove Claude Code hooks' }, sharedRaw));
  const realHook = await resolveChangeTarget(projectRoot, CLAUDE_HOOK_FILE);
  changes.push({ path: CLAUDE_HOOK_FILE, realPath: realHook, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete ContextBrake hook script' } });
  const statusline = await planStatuslineRemove(projectRoot);
  const withStatusline = [...changes, ...statusline.changes];
  const withoutHooks = await removeFromLocalSettings({ root: projectRoot, manifest, summary: 'Remove Claude Code hooks' }, withStatusline);
  const autoRestart = await planAutoRestart({ projectRoot, autoRestart: false }, withoutHooks, { deleteFiles: false });
  return { harness: 'claude-code', changes: [...autoRestart.changes], conflicts: [...statusline.conflicts, ...autoRestart.conflicts], entries: buildClaudeEntries(), assetPaths: [CLAUDE_HOOK_FILE, STATUSLINE_BRIDGE_FILE, ...MOD_FILES] };
}
