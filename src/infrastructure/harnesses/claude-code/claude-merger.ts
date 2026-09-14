import { CLAUDE_HOOK_FILE } from './planner.js';

export type ClaudeHookEntry = { type: string; command: string };
export type ClaudeHookGroup = { matcher: string; hooks: ClaudeHookEntry[] };

export function isTargetHook(entry: unknown, event: string): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const command = (entry as Record<string, unknown>).command;
  return typeof command === 'string' && command.includes(CLAUDE_HOOK_FILE) && command.includes(event);
}

export function isTargetGroup(group: unknown, event: string): boolean {
  if (!group || typeof group !== 'object') return false;
  const hooks = (group as Record<string, unknown>).hooks;
  return Array.isArray(hooks) && hooks.some((entry) => isTargetHook(entry, event));
}

export function mergeHookGroups(
  existing: unknown,
  event: string,
  matcher: string
): ClaudeHookGroup[] {
  const preserved: ClaudeHookGroup[] = [];
  if (Array.isArray(existing)) {
    for (const item of existing) {
      if (!isTargetGroup(item, event) && item && typeof item === 'object') {
        preserved.push(item as ClaudeHookGroup);
      }
    }
  }
  preserved.push({
    matcher,
    hooks: [{ type: 'command', command: `node ${CLAUDE_HOOK_FILE} ${event}` }],
  });
  return preserved;
}

export function removeHookGroups(existing: unknown, event: string): ClaudeHookGroup[] {
  if (!Array.isArray(existing)) return [];
  return existing.filter((item) => !isTargetGroup(item, event)) as ClaudeHookGroup[];
}
