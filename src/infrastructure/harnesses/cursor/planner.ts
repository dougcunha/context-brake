import { readFile } from 'node:fs/promises';
import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { validateRemovalConfig } from '../common/removal-config-validator.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';
import { updateCursorHooks } from '../common/cursor-hooks-updater.js';

export const CURSOR_CONFIG_FILE = '.cursor/hooks.json';
export const CURSOR_HOOK_FILE = '.cursor/hooks/context-brake.mjs';

export function buildCursorEntries(): ManagedEntry[] {
  return [
    { harness: 'cursor', path: CURSOR_CONFIG_FILE, identity: `preToolUse|${CURSOR_HOOK_FILE}` },
    { harness: 'cursor', path: CURSOR_CONFIG_FILE, identity: `postToolUse|${CURSOR_HOOK_FILE}` },
    { harness: 'cursor', path: CURSOR_CONFIG_FILE, identity: `sessionStart|${CURSOR_HOOK_FILE}` },
  ];
}

function updateHooks(content: string, clear: boolean): string {
  return updateCursorHooks(content, clear);
}

export async function planCursorInstall(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, CURSOR_CONFIG_FILE);
  let content = '{\n  "version": 1\n}\n';
  try {
    content = await readFile(realConfig, 'utf8');
    const validation = validateJsonDocument(content);
    if (!validation.valid) {
      const detail = validation.errors.join('; ');
      return { harness: 'cursor', changes: [], conflicts: [{ path: CURSOR_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      const msg = error instanceof Error ? error.message : String(error);
      return { harness: 'cursor', changes: [], conflicts: [{ path: CURSOR_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail: msg }], entries: [] };
    }
  }
  let updated: string;
  try {
    updated = updateHooks(content, false);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return { harness: 'cursor', changes: [], conflicts: [{ path: CURSOR_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
  }
  const assetContent = await loadRuntimeAsset('cursor-hook.mjs');
  const changes: PlannedChange[] = [
    { path: CURSOR_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Register Cursor hooks' } },
    { path: CURSOR_HOOK_FILE, realPath: await resolveChangeTarget(projectRoot, CURSOR_HOOK_FILE), kind: 'create', owner: 'runtime_asset', content: assetContent, preview: { summary: 'Install ContextBrake hook script' } },
  ];
  return { harness: 'cursor', changes, conflicts: [], entries: buildCursorEntries() };
}

export async function planCursorRemove(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, CURSOR_CONFIG_FILE);
  const raw = await readFile(realConfig, 'utf8').catch(() => null);
  const conflict = validateRemovalConfig(raw, CURSOR_CONFIG_FILE);
  if (conflict) {
    return { harness: 'cursor', changes: [], conflicts: [conflict], entries: buildCursorEntries(), assetPaths: [CURSOR_HOOK_FILE] };
  }
  const changes: PlannedChange[] = [];
  if (raw !== null) {
    const updated = updateHooks(raw, true);
    changes.push({ path: CURSOR_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Remove Cursor hooks' } });
  }
  const realHook = await resolveChangeTarget(projectRoot, CURSOR_HOOK_FILE);
  changes.push({ path: CURSOR_HOOK_FILE, realPath: realHook, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete ContextBrake hook script' } });
  return { harness: 'cursor', changes, conflicts: [], entries: buildCursorEntries(), assetPaths: [CURSOR_HOOK_FILE] };
}
