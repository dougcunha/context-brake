import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence } from '../common/path-helpers.js';

export const OPENCODE_PROJECT_FILES = [
  'opencode.json',
  'opencode.jsonc',
] as const;

export const OPENCODE_PROJECT_DIRS = ['.opencode'] as const;
export const OPENCODE_USER_FILES = [
  '.config/opencode/plugins',
  '.config/opencode/opencode.json',
] as const;
export const OPENCODE_EXECUTABLES = ['opencode'] as const;

export async function detectOpenCode(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const project = await checkProjectEvidence(projectRoot, OPENCODE_PROJECT_FILES, OPENCODE_PROJECT_DIRS);
  const machine = await checkUserEvidence(OPENCODE_USER_FILES, userHome);
  return [...project, ...machine];
}
