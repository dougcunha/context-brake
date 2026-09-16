import { readFile } from 'node:fs/promises';
import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { removeAntigravityHooks, updateAntigravityHooks } from '../common/antigravity-hooks-updater.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { validateRemovalConfig } from '../common/removal-config-validator.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';

export const ANTIGRAVITY_CONFIG_FILE = '.agents/hooks.json';
export const ANTIGRAVITY_HOOK_FILE = '.agents/hooks/context-brake.mjs';

export function buildAntigravityEntries(): ManagedEntry[] {
  return [
    { harness: 'antigravity-cli', path: ANTIGRAVITY_CONFIG_FILE, identity: `PreInvocation|context-brake|${ANTIGRAVITY_HOOK_FILE}` },
    { harness: 'antigravity-cli', path: ANTIGRAVITY_CONFIG_FILE, identity: `PreToolUse|context-brake|${ANTIGRAVITY_HOOK_FILE}` },
    { harness: 'antigravity-cli', path: ANTIGRAVITY_CONFIG_FILE, identity: `PostToolUse|context-brake|${ANTIGRAVITY_HOOK_FILE}` },
  ];
}

export async function planAntigravityInstall(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, ANTIGRAVITY_CONFIG_FILE);
  let content = '{\n}\n';
  try {
    content = await readFile(realConfig, 'utf8');
    const validation = validateJsonDocument(content);
    if (!validation.valid) {
      const detail = validation.errors.join('; ');
      return { harness: 'antigravity-cli', changes: [], conflicts: [{ path: ANTIGRAVITY_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      const msg = error instanceof Error ? error.message : String(error);
      return { harness: 'antigravity-cli', changes: [], conflicts: [{ path: ANTIGRAVITY_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail: msg }], entries: [] };
    }
  }
  let updated: string;
  try {
    updated = updateAntigravityHooks(content);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return { harness: 'antigravity-cli', changes: [], conflicts: [{ path: ANTIGRAVITY_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
  }
  const assetContent = await loadRuntimeAsset('antigravity-cli-hook.mjs');
  const changes: PlannedChange[] = [
    { path: ANTIGRAVITY_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Register Antigravity hooks' } },
    { path: ANTIGRAVITY_HOOK_FILE, realPath: await resolveChangeTarget(projectRoot, ANTIGRAVITY_HOOK_FILE), kind: 'create', owner: 'runtime_asset', content: assetContent, preview: { summary: 'Install ContextBrake hook script' } },
  ];
  return { harness: 'antigravity-cli', changes, conflicts: [], entries: buildAntigravityEntries() };
}

export async function planAntigravityRemove(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, ANTIGRAVITY_CONFIG_FILE);
  const raw = await readFile(realConfig, 'utf8').catch(() => null);
  const conflict = validateRemovalConfig(raw, ANTIGRAVITY_CONFIG_FILE);
  if (conflict) {
    return { harness: 'antigravity-cli', changes: [], conflicts: [conflict], entries: buildAntigravityEntries(), assetPaths: [ANTIGRAVITY_HOOK_FILE] };
  }
  const changes: PlannedChange[] = [];
  if (raw !== null) {
    const updated = removeAntigravityHooks(raw);
    changes.push({ path: ANTIGRAVITY_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Remove Antigravity hooks' } });
  }
  const realHook = await resolveChangeTarget(projectRoot, ANTIGRAVITY_HOOK_FILE);
  changes.push({ path: ANTIGRAVITY_HOOK_FILE, realPath: realHook, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete ContextBrake hook script' } });
  return { harness: 'antigravity-cli', changes, conflicts: [], entries: buildAntigravityEntries(), assetPaths: [ANTIGRAVITY_HOOK_FILE] };
}
