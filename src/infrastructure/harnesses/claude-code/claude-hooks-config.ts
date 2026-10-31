import { parse } from 'jsonc-parser';
import { removeJsonProperty, setJsonProperty } from '../../storage/json-document-editor.js';
import { removeOwnedFromOtherEvents } from '../common/hook-event-cleanup.js';
import { isClaudeOwnedHandler, mergeHookGroups, removeHookGroups, type ClaudeHookGroup } from './claude-merger.js';

const HOOK_EVENTS = [['PostToolUse', '*'], ['SessionStart', 'startup|resume|clear|compact'], ['Stop', '*']] as const;
type HookTransform = (existing: unknown, event: string, matcher: string) => ClaudeHookGroup[];
type EventPlan = { readonly hooks: Record<string, unknown>; readonly event: string; readonly matcher: string };

// jsonc-parser lê os comentários que o Claude Code aceita nos arquivos de configuração; JSON.parse falharia neles.
export function parseHooks(content: string): Record<string, unknown> {
  const root = parse(content, [], { allowTrailingComma: true }) as { hooks?: unknown } | null;
  const hooks = root?.hooks;
  return hooks !== null && typeof hooks === 'object' && !Array.isArray(hooks) ? hooks as Record<string, unknown> : {};
}

function applyEvent(text: string, plan: EventPlan, fn: HookTransform): string {
  const groups = fn(plan.hooks[plan.event], plan.event, plan.matcher);
  if (groups.length === 0) return removeJsonProperty(text, ['hooks', plan.event]);
  return setJsonProperty(text, ['hooks', plan.event], groups);
}

export function applyHooks(content: string, merge: boolean): string {
  const hooks = parseHooks(content);
  const fn: HookTransform = merge ? mergeHookGroups : removeHookGroups;
  const applied = HOOK_EVENTS.reduce((text, [event, matcher]) => applyEvent(text, { hooks, event, matcher }, fn), content);
  return removeOwnedFromOtherEvents(applied, HOOK_EVENTS.map(([event]) => event), isClaudeOwnedHandler);
}
