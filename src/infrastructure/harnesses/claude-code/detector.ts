import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence } from '../common/path-helpers.js';

export const CLAUDE_PROJECT_FILES = [
  '.claude/settings.json',
  '.claude/settings.local.json',
  'CLAUDE.md',
] as const;

export const CLAUDE_PROJECT_DIRS = ['.claude'] as const;
export const CLAUDE_USER_FILES = ['.claude/settings.json'] as const;
export const CLAUDE_EXECUTABLES = ['claude'] as const;

export async function detectClaude(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const project = await checkProjectEvidence(projectRoot, CLAUDE_PROJECT_FILES, CLAUDE_PROJECT_DIRS);
  const machine = await checkUserEvidence(CLAUDE_USER_FILES, userHome);
  return [...project, ...machine];
}
