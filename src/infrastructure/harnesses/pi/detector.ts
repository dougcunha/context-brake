import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence } from '../common/path-helpers.js';

export const PI_PROJECT_FILES = ['.pi/settings.json'] as const;
export const PI_PROJECT_DIRS = ['.pi/extensions', '.pi'] as const;
export const PI_USER_FILES = ['.pi/agent/extensions', '.pi/settings.json'] as const;
export const PI_EXECUTABLES = ['pi'] as const;

export async function detectPi(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const project = await checkProjectEvidence(projectRoot, PI_PROJECT_FILES, PI_PROJECT_DIRS);
  const machine = await checkUserEvidence(PI_USER_FILES, userHome);
  return [...project, ...machine];
}
