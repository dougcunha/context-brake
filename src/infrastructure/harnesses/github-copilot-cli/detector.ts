import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence } from '../common/path-helpers.js';

export const COPILOT_PROJECT_FILES = [
  '.github/copilot/settings.json',
  '.github/copilot/settings.local.json',
  '.github/hooks/context-brake.json',
  'copilot-instructions.md',
] as const;

export const COPILOT_PROJECT_DIRS = ['.github/copilot', '.github/hooks'] as const;
export const COPILOT_USER_FILES = ['.copilot/settings.json'] as const;
export const COPILOT_EXECUTABLES = ['copilot'] as const;

export async function detectCopilot(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const project = await checkProjectEvidence(projectRoot, COPILOT_PROJECT_FILES, COPILOT_PROJECT_DIRS);
  const machine = await checkUserEvidence(COPILOT_USER_FILES, userHome);
  return [...project, ...machine];
}
