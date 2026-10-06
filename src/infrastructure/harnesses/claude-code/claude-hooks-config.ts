import { removeJsonProperty, setJsonProperty } from '../../storage/json-document-editor.js';
import { mergeHookGroups, removeHookGroups, type ClaudeHookGroup } from './claude-merger.js';

const HOOK_EVENTS = [['PreToolUse', '*'], ['PostToolUse', '*'], ['SessionStart', 'startup|resume|clear|compact'], ['Stop', '*']] as const;
type HookTransform = (existing: unknown, event: string, matcher: string) => ClaudeHookGroup[];
type EventPlan = { readonly hooks: Record<string, unknown>; readonly event: string; readonly matcher: string };

function parseHooks(content: string): Record<string, unknown> {
  try {
    const obj = JSON.parse(content) as Record<string, unknown>;
    return (obj.hooks as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function applyEvent(text: string, plan: EventPlan, fn: HookTransform): string {
  const groups = fn(plan.hooks[plan.event], plan.event, plan.matcher);
  if (groups.length === 0) return removeJsonProperty(text, ['hooks', plan.event]);
  return setJsonProperty(text, ['hooks', plan.event], groups);
}

export function applyHooks(content: string, merge: boolean): string {
  const hooks = parseHooks(content);
  const fn: HookTransform = merge ? mergeHookGroups : removeHookGroups;
  return HOOK_EVENTS.reduce((text, [event, matcher]) => applyEvent(text, { hooks, event, matcher }, fn), content);
}
