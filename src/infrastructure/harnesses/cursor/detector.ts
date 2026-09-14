import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence } from '../common/path-helpers.js';

export const CURSOR_PROJECT_FILES = [
  '.cursor/hooks.json',
  '.cursor/cli.json',
] as const;

export const CURSOR_PROJECT_DIRS = ['.cursor'] as const;
export const CURSOR_USER_FILES = ['.cursor/hooks.json'] as const;
export const CURSOR_EXECUTABLES = ['agent', 'cursor-agent'] as const;

export async function detectCursor(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const project = await checkProjectEvidence(projectRoot, CURSOR_PROJECT_FILES, CURSOR_PROJECT_DIRS);
  const machine = await checkUserEvidence(CURSOR_USER_FILES, userHome);
  return [...project, ...machine];
}
