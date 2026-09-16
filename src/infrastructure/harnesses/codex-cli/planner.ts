import { readFile } from 'node:fs/promises';
import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { validateRemovalConfig } from '../common/removal-config-validator.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';
import { updateCodexHooks } from '../common/codex-hooks-updater.js';

export const CODEX_CONFIG_FILE = '.codex/hooks.json';
export const CODEX_HOOK_FILE = '.codex/hooks/context-brake.mjs';
const GIT_ROOT_EXPANSION = '$(git rev-parse --show-toplevel)';
const CMD_GIT_ROOT = 'for /f "delims=" %i in (\'git rev-parse --show-toplevel\') do @node "%i';

function buildHookGroup(event: string) {
  const matcher = event === 'SessionStart' ? 'startup|resume|clear|compact' : '*';
  return {
    matcher,
    hooks: [
      {
        type: 'command',
        command: `node "${GIT_ROOT_EXPANSION}/${CODEX_HOOK_FILE}" ${event}`,
        commandWindows: `${CMD_GIT_ROOT}/${CODEX_HOOK_FILE}" ${event}`,
      },
    ],
  };
}

export function buildCodexEntries(): ManagedEntry[] {
  return [
    { harness: 'codex-cli', path: CODEX_CONFIG_FILE, identity: `PreToolUse|*|${CODEX_HOOK_FILE}` },
    { harness: 'codex-cli', path: CODEX_CONFIG_FILE, identity: `PostToolUse|*|${CODEX_HOOK_FILE}` },
    { harness: 'codex-cli', path: CODEX_CONFIG_FILE, identity: `SessionStart|startup|resume|clear|compact|${CODEX_HOOK_FILE}` },
    { harness: 'codex-cli', path: CODEX_CONFIG_FILE, identity: `Stop|*|${CODEX_HOOK_FILE}` },
  ];
}

function updateHooks(content: string, clear: boolean): string {
  return updateCodexHooks(content, clear, buildHookGroup);
}

export async function planCodexInstall(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, CODEX_CONFIG_FILE);
  let content = '{\n}\n';
  try {
    content = await readFile(realConfig, 'utf8');
    const validation = validateJsonDocument(content);
    if (!validation.valid) {
      const detail = validation.errors.join('; ');
      return { harness: 'codex-cli', changes: [], conflicts: [{ path: CODEX_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      const msg = error instanceof Error ? error.message : String(error);
      return { harness: 'codex-cli', changes: [], conflicts: [{ path: CODEX_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail: msg }], entries: [] };
    }
  }
  let updated: string;
  try {
    updated = updateHooks(content, false);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return { harness: 'codex-cli', changes: [], conflicts: [{ path: CODEX_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
  }
  const assetContent = await loadRuntimeAsset('codex-cli-hook.mjs');
  const changes: PlannedChange[] = [
    { path: CODEX_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Register Codex hooks' } },
    { path: CODEX_HOOK_FILE, realPath: await resolveChangeTarget(projectRoot, CODEX_HOOK_FILE), kind: 'create', owner: 'runtime_asset', content: assetContent, preview: { summary: 'Install ContextBrake hook script' } },
  ];
  return { harness: 'codex-cli', changes, conflicts: [], entries: buildCodexEntries() };
}

export async function planCodexRemove(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, CODEX_CONFIG_FILE);
  const raw = await readFile(realConfig, 'utf8').catch(() => null);
  const conflict = validateRemovalConfig(raw, CODEX_CONFIG_FILE);
  if (conflict) {
    return { harness: 'codex-cli', changes: [], conflicts: [conflict], entries: buildCodexEntries(), assetPaths: [CODEX_HOOK_FILE] };
  }
  const changes: PlannedChange[] = [];
  if (raw !== null) {
    const updated = updateHooks(raw, true);
    changes.push({ path: CODEX_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Remove Codex hooks' } });
  }
  const realHook = await resolveChangeTarget(projectRoot, CODEX_HOOK_FILE);
  changes.push({ path: CODEX_HOOK_FILE, realPath: realHook, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete ContextBrake hook script' } });
  return { harness: 'codex-cli', changes, conflicts: [], entries: buildCodexEntries(), assetPaths: [CODEX_HOOK_FILE] };
}
