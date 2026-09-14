import { readFile } from 'node:fs/promises';
import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { setJsonProperty } from '../../storage/json-document-editor.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';

export const CODEX_CONFIG_FILE = '.codex/hooks.json';
export const CODEX_HOOK_FILE = '.codex/hooks/context-brake.mjs';

function buildHookGroup(event: string, matcher: string) {
  return { matcher, hooks: [{ type: 'command', command: `node ${CODEX_HOOK_FILE} ${event}` }] };
}

export function buildCodexEntries(): ManagedEntry[] {
  return [
    { harness: 'codex-cli', path: CODEX_CONFIG_FILE, identity: `PreToolUse|*|${CODEX_HOOK_FILE}` },
    { harness: 'codex-cli', path: CODEX_CONFIG_FILE, identity: `PostToolUse|*|${CODEX_HOOK_FILE}` },
    { harness: 'codex-cli', path: CODEX_CONFIG_FILE, identity: `SessionStart|startup|resume|clear|compact|${CODEX_HOOK_FILE}` },
  ];
}

function updateHooks(content: string, clear: boolean): string {
  let text = content;
  const pre = clear ? [] : [buildHookGroup('PreToolUse', '*')];
  const post = clear ? [] : [buildHookGroup('PostToolUse', '*')];
  const session = clear ? [] : [buildHookGroup('SessionStart', 'startup|resume|clear|compact')];
  text = setJsonProperty(text, ['hooks', 'PreToolUse'], pre);
  text = setJsonProperty(text, ['hooks', 'PostToolUse'], post);
  return setJsonProperty(text, ['hooks', 'SessionStart'], session);
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
  const assetContent = await loadRuntimeAsset('process-hook.mjs');
  const changes: PlannedChange[] = [
    { path: CODEX_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Register Codex hooks' } },
    { path: CODEX_HOOK_FILE, realPath: await resolveChangeTarget(projectRoot, CODEX_HOOK_FILE), kind: 'create', owner: 'runtime_asset', content: assetContent, preview: { summary: 'Install ContextBrake hook script' } },
  ];
  return { harness: 'codex-cli', changes, conflicts: [], entries: buildCodexEntries() };
}

export async function planCodexRemove(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, CODEX_CONFIG_FILE);
  const changes: PlannedChange[] = [];
  const raw = await readFile(realConfig, 'utf8').catch(() => null);
  if (raw !== null) {
    validateJsonDocument(raw);
    const updated = updateHooks(raw, true);
    changes.push({ path: CODEX_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Remove Codex hooks' } });
  }
  const realHook = await resolveChangeTarget(projectRoot, CODEX_HOOK_FILE);
  changes.push({ path: CODEX_HOOK_FILE, realPath: realHook, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete ContextBrake hook script' } });
  return { harness: 'codex-cli', changes, conflicts: [], entries: buildCodexEntries() };
}
