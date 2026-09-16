import { findNodeAtLocation, getNodeValue } from 'jsonc-parser';
import { parseAndValidateJson, removeJsonProperty, setJsonProperty } from '../../storage/json-document-editor.js';

export const ANTIGRAVITY_CONFIG_FILE = '.agents/hooks.json';
export const ANTIGRAVITY_HOOK_FILE = '.agents/hooks/context-brake.mjs';

function desiredHandler(event: string): { type: string; command: string } {
  return { type: 'command', command: `node ${ANTIGRAVITY_HOOK_FILE} ${event}` };
}
const DESIRED_HOOK = {
  PreInvocation: [desiredHandler('PreInvocation')],
  PreToolUse: [desiredHandler('PreToolUse')],
  PostToolUse: [desiredHandler('PostToolUse')],
};

function hasMatchingRegistration(content: string): boolean {
  try {
    const obj = JSON.parse(content) as Record<string, unknown>;
    return JSON.stringify(obj['context-brake'] ?? null) === JSON.stringify(DESIRED_HOOK);
  } catch {
    return false;
  }
}

function cleanLegacyHooks(content: string): string {
  let text = removeJsonProperty(content, ['hooks', 'PreToolUse', 'context-brake']);
  text = removeJsonProperty(text, ['hooks', 'PreInvocation', 'context-brake']);
  const tree = parseAndValidateJson(text);
  const hooksNode = findNodeAtLocation(tree, ['hooks']);
  if (!hooksNode || hooksNode.type !== 'object') return text;
  const val = getNodeValue(hooksNode) as Record<string, unknown>;
  const entries = Object.values(val);
  const hasUserEventArray = entries.some((v) => Array.isArray(v));
  if (hasUserEventArray) return text;
  const allEmptyObjects = entries.every(
    (v) => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0
  );
  return allEmptyObjects ? removeJsonProperty(text, ['hooks']) : text;
}

export function updateAntigravityHooks(content: string): string {
  const text = cleanLegacyHooks(content);
  if (hasMatchingRegistration(text)) return text;
  return setJsonProperty(text, ['context-brake'], DESIRED_HOOK);
}

export function removeAntigravityHooks(content: string): string {
  const text = cleanLegacyHooks(content);
  return removeJsonProperty(text, ['context-brake']);
}
