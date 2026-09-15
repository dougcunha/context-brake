import { findNodeAtLocation, getNodeValue } from 'jsonc-parser';
import { appendJsonArrayItem, parseAndValidateJson, removeJsonArrayItem, setJsonProperty } from '../../storage/json-document-editor.js';

export const CODEX_HOOK_FILE = '.codex/hooks/context-brake.mjs';
export const CODEX_EVENTS = ['PreToolUse', 'PostToolUse', 'SessionStart'] as const;

export type CodexHook = { type: string; command: string; commandWindows?: string };
export type CodexGroup = { matcher: string; hooks: CodexHook[] };

export function isCodexOwnedHandler(handler: unknown): boolean {
  if (typeof handler !== 'object' || handler === null) return false;
  const h = handler as { command?: unknown; commandWindows?: unknown };
  return (typeof h.command === 'string' && h.command.includes(CODEX_HOOK_FILE)) ||
         (typeof h.commandWindows === 'string' && h.commandWindows.includes(CODEX_HOOK_FILE));
}

function isGroupPurelyOwned(group: unknown): boolean {
  if (typeof group !== 'object' || group === null) return false;
  const g = group as { hooks?: unknown[] };
  return Array.isArray(g.hooks) && g.hooks.length > 0 && g.hooks.every(isCodexOwnedHandler);
}

function groupHasOwnedHandler(group: unknown): boolean {
  if (typeof group !== 'object' || group === null) return false;
  const g = group as { hooks?: unknown[] };
  return Array.isArray(g.hooks) && g.hooks.some(isCodexOwnedHandler);
}

function groupMatchesDesired(group: unknown, desired: CodexGroup): boolean {
  if (typeof group !== 'object' || group === null) return false;
  const g = group as { matcher?: unknown; hooks?: unknown[] };
  if (g.matcher !== desired.matcher || !Array.isArray(g.hooks) || g.hooks.length !== 1) return false;
  const h = g.hooks[0] as CodexHook;
  return h.type === desired.hooks[0]!.type && h.command === desired.hooks[0]!.command && h.commandWindows === desired.hooks[0]!.commandWindows;
}

function removeOwnedFromEvent(content: string, event: string): string {
  let text = content;
  while (true) {
    const next = removeJsonArrayItem(text, ['hooks', event], isGroupPurelyOwned);
    if (next === text) break;
    text = next;
  }
  const tree = parseAndValidateJson(text);
  const eventNode = findNodeAtLocation(tree, ['hooks', event]);
  if (!eventNode) return text;
  const groups = Array.isArray(getNodeValue(eventNode)) ? (getNodeValue(eventNode) as unknown[]) : [];
  for (let i = 0; i < groups.length; i++) {
    while (true) {
      const next = removeJsonArrayItem(text, ['hooks', event, i, 'hooks'], isCodexOwnedHandler);
      if (next === text) break;
      text = next;
    }
  }
  return text;
}

export function updateCodexHooks(content: string, clear: boolean, buildGroup: (event: string) => CodexGroup): string {
  let text = content;
  for (const event of CODEX_EVENTS) {
    const desired = buildGroup(event);
    const tree = parseAndValidateJson(text);
    const eventNode = findNodeAtLocation(tree, ['hooks', event]);
    if (!eventNode) {
      if (!clear) text = setJsonProperty(text, ['hooks', event], [desired]);
      continue;
    }
    const groups = Array.isArray(getNodeValue(eventNode)) ? (getNodeValue(eventNode) as unknown[]) : [];
    const ownedGroups = groups.filter(groupHasOwnedHandler);
    if (!clear && ownedGroups.length === 1 && groupMatchesDesired(ownedGroups[0], desired)) {
      continue;
    }
    text = removeOwnedFromEvent(text, event);
    if (!clear) {
      text = appendJsonArrayItem(text, ['hooks', event], desired);
    }
  }
  return text;
}
