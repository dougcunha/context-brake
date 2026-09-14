import { CLAUDE_HOOK_FILE } from './planner.js';

export type ClaudeHookEntry = { type: string; command: string; args: string[] };
export type ClaudeHookGroup = { matcher: string; hooks: ClaudeHookEntry[] };

const HOOK_EXECUTABLE = 'node';
const PROJECT_DIR_PLACEHOLDER = '${CLAUDE_PROJECT_DIR}';

function buildHookEntry(event: string): ClaudeHookEntry {
  return { type: 'command', command: HOOK_EXECUTABLE, args: [`${PROJECT_DIR_PLACEHOLDER}/${CLAUDE_HOOK_FILE}`, event] };
}

function hookInvocation(entry: Record<string, unknown>): string {
  const parts = [entry.command, ...(Array.isArray(entry.args) ? entry.args : [])];
  return parts.filter((part): part is string => typeof part === 'string').join(' ');
}

export function isTargetHook(entry: unknown, event: string): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const invocation = hookInvocation(entry as Record<string, unknown>);
  return invocation.includes(CLAUDE_HOOK_FILE) && invocation.includes(event);
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
  preserved.push({ matcher, hooks: [buildHookEntry(event)] });
  return preserved;
}

export function removeHookGroups(existing: unknown, event: string): ClaudeHookGroup[] {
  if (!Array.isArray(existing)) return [];
  return existing.filter((item) => !isTargetGroup(item, event)) as ClaudeHookGroup[];
}
