import { readFile } from 'node:fs/promises';
import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { setJsonProperty } from '../../storage/json-document-editor.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';
import { mergeHookGroups, removeHookGroups } from './claude-merger.js';

export const CLAUDE_CONFIG_FILE = '.claude/settings.json';
export const CLAUDE_HOOK_FILE = '.claude/hooks/context-brake.mjs';

export function buildClaudeEntries(): ManagedEntry[] {
  return [
    { harness: 'claude-code', path: CLAUDE_CONFIG_FILE, identity: `PreToolUse|*|${CLAUDE_HOOK_FILE}` },
    { harness: 'claude-code', path: CLAUDE_CONFIG_FILE, identity: `PostToolUse|*|${CLAUDE_HOOK_FILE}` },
    { harness: 'claude-code', path: CLAUDE_CONFIG_FILE, identity: `SessionStart|startup|resume|clear|compact|${CLAUDE_HOOK_FILE}` },
  ];
}

function parseHooks(content: string): Record<string, unknown> {
  try {
    const obj = JSON.parse(content) as Record<string, unknown>;
    return (obj.hooks as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function applyHooks(content: string, merge: boolean): string {
  const hooks = parseHooks(content);
  const fn = merge ? mergeHookGroups : removeHookGroups;
  let text = content;
  text = setJsonProperty(text, ['hooks', 'PreToolUse'], fn(hooks.PreToolUse, 'PreToolUse', '*'));
  text = setJsonProperty(text, ['hooks', 'PostToolUse'], fn(hooks.PostToolUse, 'PostToolUse', '*'));
  return setJsonProperty(text, ['hooks', 'SessionStart'], fn(hooks.SessionStart, 'SessionStart', 'startup|resume|clear|compact'));
}

export async function planClaudeInstall(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, CLAUDE_CONFIG_FILE);
  let content = '{\n}\n';
  try {
    content = await readFile(realConfig, 'utf8');
    const validation = validateJsonDocument(content);
    if (!validation.valid) {
      const detail = validation.errors.join('; ');
      return { harness: 'claude-code', changes: [], conflicts: [{ path: CLAUDE_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      const msg = error instanceof Error ? error.message : String(error);
      return { harness: 'claude-code', changes: [], conflicts: [{ path: CLAUDE_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail: msg }], entries: [] };
    }
  }
  let updated: string;
  try {
    updated = applyHooks(content, true);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return { harness: 'claude-code', changes: [], conflicts: [{ path: CLAUDE_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
  }
  const assetContent = await loadRuntimeAsset('claude-code-hook.mjs');
  const changes: PlannedChange[] = [
    { path: CLAUDE_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Register Claude Code hooks' } },
    { path: CLAUDE_HOOK_FILE, realPath: await resolveChangeTarget(projectRoot, CLAUDE_HOOK_FILE), kind: 'create', owner: 'runtime_asset', content: assetContent, preview: { summary: 'Install ContextBrake hook script' } },
  ];
  return { harness: 'claude-code', changes, conflicts: [], entries: buildClaudeEntries() };
}

export async function planClaudeRemove(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, CLAUDE_CONFIG_FILE);
  const changes: PlannedChange[] = [];
  const raw = await readFile(realConfig, 'utf8').catch(() => null);
  if (raw !== null) {
    validateJsonDocument(raw);
    const updated = applyHooks(raw, false);
    changes.push({ path: CLAUDE_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Remove Claude Code hooks' } });
  }
  const realHook = await resolveChangeTarget(projectRoot, CLAUDE_HOOK_FILE);
  changes.push({ path: CLAUDE_HOOK_FILE, realPath: realHook, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete ContextBrake hook script' } });
  return { harness: 'claude-code', changes, conflicts: [], entries: buildClaudeEntries() };
}
