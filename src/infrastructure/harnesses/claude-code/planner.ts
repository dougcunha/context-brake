import { readFile } from 'node:fs/promises';
import type { AdapterPlan, HarnessContext } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { removeJsonProperty, setJsonProperty } from '../../storage/json-document-editor.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { validateRemovalConfig } from '../common/removal-config-validator.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';
import { mergeHookGroups, removeHookGroups, type ClaudeHookGroup } from './claude-merger.js';
import { planStatuslineInstall, planStatuslineRemove } from './statusline-planner.js';
import { STATUSLINE_BRIDGE_FILE } from './statusline-settings.js';

export const CLAUDE_CONFIG_FILE = '.claude/settings.json';
export const CLAUDE_HOOK_FILE = '.claude/hooks/context-brake.mjs';

export function buildClaudeEntries(): ManagedEntry[] {
  return [
    { harness: 'claude-code', path: CLAUDE_CONFIG_FILE, identity: `PreToolUse|*|${CLAUDE_HOOK_FILE}` },
    { harness: 'claude-code', path: CLAUDE_CONFIG_FILE, identity: `PostToolUse|*|${CLAUDE_HOOK_FILE}` },
    { harness: 'claude-code', path: CLAUDE_CONFIG_FILE, identity: `SessionStart|startup|resume|clear|compact|${CLAUDE_HOOK_FILE}` },
    { harness: 'claude-code', path: CLAUDE_CONFIG_FILE, identity: `Stop|*|${CLAUDE_HOOK_FILE}` },
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

const HOOK_EVENTS = [['PreToolUse', '*'], ['PostToolUse', '*'], ['SessionStart', 'startup|resume|clear|compact'], ['Stop', '*']] as const;
type HookTransform = (existing: unknown, event: string, matcher: string) => ClaudeHookGroup[];
type EventPlan = { readonly hooks: Record<string, unknown>; readonly event: string; readonly matcher: string };

function applyEvent(text: string, plan: EventPlan, fn: HookTransform): string {
  const groups = fn(plan.hooks[plan.event], plan.event, plan.matcher);
  if (groups.length === 0) return removeJsonProperty(text, ['hooks', plan.event]);
  return setJsonProperty(text, ['hooks', plan.event], groups);
}

function applyHooks(content: string, merge: boolean): string {
  const hooks = parseHooks(content);
  const fn: HookTransform = merge ? mergeHookGroups : removeHookGroups;
  return HOOK_EVENTS.reduce((text, [event, matcher]) => applyEvent(text, { hooks, event, matcher }, fn), content);
}

function invalidConfigPlan(detail: string): AdapterPlan {
  return { harness: 'claude-code', changes: [], conflicts: [{ path: CLAUDE_CONFIG_FILE, code: 'INVALID_HARNESS_CONFIG', detail }], entries: [] };
}

export async function planClaudeInstall(context: HarnessContext): Promise<AdapterPlan> {
  const projectRoot = context.projectRoot;
  const realConfig = await resolveChangeTarget(projectRoot, CLAUDE_CONFIG_FILE);
  let content = '{\n}\n';
  try {
    content = await readFile(realConfig, 'utf8');
    const validation = validateJsonDocument(content);
    if (!validation.valid) return invalidConfigPlan(validation.errors.join('; '));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return invalidConfigPlan(error instanceof Error ? error.message : String(error));
  }
  let updated: string;
  try {
    updated = applyHooks(content, true);
  } catch (error: unknown) {
    return invalidConfigPlan(error instanceof Error ? error.message : String(error));
  }
  const assetContent = await loadRuntimeAsset('claude-code-hook.mjs');
  const statusline = await planStatuslineInstall(context);
  const changes: PlannedChange[] = [
    { path: CLAUDE_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Register Claude Code hooks' } },
    { path: CLAUDE_HOOK_FILE, realPath: await resolveChangeTarget(projectRoot, CLAUDE_HOOK_FILE), kind: 'create', owner: 'runtime_asset', content: assetContent, preview: { summary: 'Install ContextBrake hook script' } },
    ...statusline.changes,
  ];
  return { harness: 'claude-code', changes, conflicts: statusline.conflicts, entries: buildClaudeEntries(), findings: statusline.findings };
}

export async function planClaudeRemove(projectRoot: string): Promise<AdapterPlan> {
  const realConfig = await resolveChangeTarget(projectRoot, CLAUDE_CONFIG_FILE);
  const raw = await readFile(realConfig, 'utf8').catch(() => null);
  const conflict = validateRemovalConfig(raw, CLAUDE_CONFIG_FILE);
  if (conflict) {
    return { harness: 'claude-code', changes: [], conflicts: [conflict], entries: buildClaudeEntries(), assetPaths: [CLAUDE_HOOK_FILE, STATUSLINE_BRIDGE_FILE] };
  }
  const changes: PlannedChange[] = [];
  if (raw !== null) {
    const updated = applyHooks(raw, false);
    changes.push({ path: CLAUDE_CONFIG_FILE, realPath: realConfig, kind: 'update', owner: 'harness_entry', content: updated, preview: { summary: 'Remove Claude Code hooks' } });
  }
  const realHook = await resolveChangeTarget(projectRoot, CLAUDE_HOOK_FILE);
  changes.push({ path: CLAUDE_HOOK_FILE, realPath: realHook, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete ContextBrake hook script' } });
  const statusline = await planStatuslineRemove(projectRoot);
  changes.push(...statusline.changes);
  return { harness: 'claude-code', changes, conflicts: statusline.conflicts, entries: buildClaudeEntries(), assetPaths: [CLAUDE_HOOK_FILE, STATUSLINE_BRIDGE_FILE] };
}
