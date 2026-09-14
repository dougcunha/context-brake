import { readFile } from 'node:fs/promises';
import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';

export const COPILOT_CONFIG_FILE = '.github/hooks/context-brake.json';
export const COPILOT_HOOK_FILE = '.github/hooks/context-brake.mjs';
const REPOSITORY_ROOT = '.';

function buildHookEntry(event: string) {
  return {
    type: 'command',
    exec: 'node',
    args: [COPILOT_HOOK_FILE, event],
    cwd: REPOSITORY_ROOT,
  };
}

export function buildCopilotEntries(): ManagedEntry[] {
  return [
    { harness: 'github-copilot-cli', path: COPILOT_CONFIG_FILE, identity: `preToolUse|${COPILOT_HOOK_FILE}` },
    { harness: 'github-copilot-cli', path: COPILOT_CONFIG_FILE, identity: `postToolUse|${COPILOT_HOOK_FILE}` },
    { harness: 'github-copilot-cli', path: COPILOT_CONFIG_FILE, identity: `sessionStart|${COPILOT_HOOK_FILE}` },
  ];
}

function buildConfigFile(): string {
  const content = {
    version: 1,
    hooks: {
      preToolUse: [buildHookEntry('preToolUse')],
      postToolUse: [buildHookEntry('postToolUse')],
      sessionStart: [buildHookEntry('sessionStart')],
    },
  };
  return `${JSON.stringify(content, null, 2)}\n`;
}

export async function planCopilotInstall(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, COPILOT_CONFIG_FILE);
  try {
    const raw = await readFile(realConfig, 'utf8');
    const validation = validateJsonDocument(raw);
    if (!validation.valid) {
      const detail = validation.errors.join('; ');
      return { harness: 'github-copilot-cli', changes: [], conflicts: [{ path: COPILOT_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      const msg = error instanceof Error ? error.message : String(error);
      return { harness: 'github-copilot-cli', changes: [], conflicts: [{ path: COPILOT_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail: msg }], entries: [] };
    }
  }
  const assetContent = await loadRuntimeAsset('github-copilot-cli-hook.mjs');
  const realHook = await resolveChangeTarget(projectRoot, COPILOT_HOOK_FILE);
  const changes: PlannedChange[] = [
    { path: COPILOT_CONFIG_FILE, realPath: realConfig, kind: 'create', owner: 'harness_entry', content: buildConfigFile(), preview: { summary: 'Create Copilot hooks config' } },
    { path: COPILOT_HOOK_FILE, realPath: realHook, kind: 'create', owner: 'runtime_asset', content: assetContent, preview: { summary: 'Install ContextBrake hook script' } },
  ];
  return { harness: 'github-copilot-cli', changes, conflicts: [], entries: buildCopilotEntries() };
}

export async function planCopilotRemove(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, COPILOT_CONFIG_FILE);
  const realHook = await resolveChangeTarget(projectRoot, COPILOT_HOOK_FILE);
  const changes: PlannedChange[] = [
    { path: COPILOT_CONFIG_FILE, realPath: realConfig, kind: 'delete', owner: 'harness_entry', content: null, preview: { summary: 'Delete Copilot hooks config' } },
    { path: COPILOT_HOOK_FILE, realPath: realHook, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete ContextBrake hook script' } },
  ];
  return { harness: 'github-copilot-cli', changes, conflicts: [], entries: buildCopilotEntries() };
}
