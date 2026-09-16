import { findNodeAtLocation, getNodeValue } from 'jsonc-parser';
import { appendJsonArrayItem, parseAndValidateJson, removeJsonArrayItem, removeJsonProperty, setJsonProperty } from '../../storage/json-document-editor.js';

export const CURSOR_HOOK_FILE = '.cursor/hooks/context-brake.mjs';
const CURSOR_EVENTS = ['preToolUse', 'postToolUse', 'sessionStart', 'preCompact'] as const;

type CursorEvent = (typeof CURSOR_EVENTS)[number];
type CursorEntry = { command: string; failClosed?: boolean };

const CURSOR_DESIRED: Record<CursorEvent, CursorEntry> = {
  preToolUse: { command: `node ${CURSOR_HOOK_FILE} preToolUse`, failClosed: true },
  postToolUse: { command: `node ${CURSOR_HOOK_FILE} postToolUse` },
  sessionStart: { command: `node ${CURSOR_HOOK_FILE} sessionStart` },
  preCompact: { command: `node ${CURSOR_HOOK_FILE} preCompact` },
};

export function isCursorOwned(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) return false;
  const cmd = (entry as { command?: unknown }).command;
  return typeof cmd === 'string' && cmd.includes(CURSOR_HOOK_FILE);
}

function matchesDesired(entry: unknown, desired: CursorEntry): boolean {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as { command?: unknown; failClosed?: unknown };
  return e.command === desired.command && Boolean(e.failClosed) === Boolean(desired.failClosed);
}

function isEmptyEventArray(text: string, event: CursorEvent): boolean {
  const tree = parseAndValidateJson(text);
  const eventNode = findNodeAtLocation(tree, ['hooks', event]);
  if (!eventNode) return false;
  const value = getNodeValue(eventNode);
  return Array.isArray(value) && value.length === 0;
}

function updateCursorEvent(text: string, event: CursorEvent, clear: boolean): string {
  const desired = CURSOR_DESIRED[event];
  const tree = parseAndValidateJson(text);
  const eventNode = findNodeAtLocation(tree, ['hooks', event]);
  if (!eventNode) {
    return clear ? text : setJsonProperty(text, ['hooks', event], [desired]);
  }
  const val = getNodeValue(eventNode);
  const arr = Array.isArray(val) ? val : [];
  const owned = arr.filter(isCursorOwned);
  if (!clear && owned.length === 1 && matchesDesired(owned[0], desired)) return text;
  let cur = text;
  while (true) {
    const next = removeJsonArrayItem(cur, ['hooks', event], isCursorOwned);
    if (next === cur) break;
    cur = next;
  }
  if (!clear) return appendJsonArrayItem(cur, ['hooks', event], desired);
  return isEmptyEventArray(cur, event) ? removeJsonProperty(cur, ['hooks', event]) : cur;
}

export function updateCursorHooks(content: string, clear: boolean): string {
  let text = content;
  const rootNode = parseAndValidateJson(text);
  if (!clear && !findNodeAtLocation(rootNode, ['version'])) {
    text = setJsonProperty(text, ['version'], 1);
  }
  for (const event of CURSOR_EVENTS) {
    text = updateCursorEvent(text, event, clear);
  }
  return text;
}
