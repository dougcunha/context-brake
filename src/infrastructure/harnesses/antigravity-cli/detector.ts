import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence, pathExists } from '../common/path-helpers.js';

export const ANTIGRAVITY_USER_FILES = ['.gemini/config/hooks.json'] as const;
export const ANTIGRAVITY_EXECUTABLES = ['agy'] as const;
const DOCUMENTED_EVENTS = ['PreToolUse', 'PostToolUse', 'PreInvocation', 'PostInvocation', 'Stop'] as const;

function isLegacyEntry(obj: Record<string, unknown>): boolean {
  if (typeof obj.hooks !== 'object' || obj.hooks === null) return false;
  const hooks = obj.hooks as Record<string, unknown>;
  const pre = hooks.PreToolUse as Record<string, unknown> | undefined;
  const inv = hooks.PreInvocation as Record<string, unknown> | undefined;
  return Boolean(pre?.['context-brake'] || inv?.['context-brake']);
}

function hasDocumentedEventArray(obj: Record<string, unknown>): boolean {
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'hooks' || typeof val !== 'object' || val === null || Array.isArray(val)) continue;
    const hookObj = val as Record<string, unknown>;
    const hasArray = Object.entries(hookObj).some(
      ([ev, handlers]) => DOCUMENTED_EVENTS.includes(ev as (typeof DOCUMENTED_EVENTS)[number]) && Array.isArray(handlers)
    );
    if (hasArray) return true;
  }
  return false;
}

function hasAntigravityEvidence(raw: string): boolean {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj !== 'object' || obj === null) return false;
    return isLegacyEntry(obj) || hasDocumentedEventArray(obj);
  } catch {
    return false;
  }
}

export async function detectAntigravity(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const evidence: DetectionEvidence[] = [];
  const hooksPath = resolve(projectRoot, '.agents/hooks.json');
  if (await pathExists(hooksPath)) {
    try {
      const content = await readFile(hooksPath, 'utf8');
      if (hasAntigravityEvidence(content)) {
        evidence.push({ origin: 'project', kind: 'config', value: '.agents/hooks.json' });
      }
    } catch {
      // Ignored for detection
    }
  }
  const extra = await checkProjectEvidence(projectRoot, ['agy.json'], ['.agy']);
  evidence.push(...extra);
  const machine = await checkUserEvidence(ANTIGRAVITY_USER_FILES, userHome);
  evidence.push(...machine);
  return evidence;
}
