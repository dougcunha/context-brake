import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence, pathExists } from '../common/path-helpers.js';

export const ANTIGRAVITY_USER_FILES = ['.gemini/config/hooks.json'] as const;
export const ANTIGRAVITY_EXECUTABLES = ['agy'] as const;

export async function detectAntigravity(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const evidence: DetectionEvidence[] = [];
  const hooksPath = resolve(projectRoot, '.agents/hooks.json');
  if (await pathExists(hooksPath)) {
    try {
      const content = await readFile(hooksPath, 'utf8');
      const obj = JSON.parse(content) as Record<string, unknown>;
      if (obj && typeof obj.hooks === 'object') {
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
