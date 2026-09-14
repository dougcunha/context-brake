import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence } from '../common/path-helpers.js';

export const OMP_PROJECT_FILES = [
  '.omp/config.yml',
  '.omp/settings.json',
] as const;

export const OMP_PROJECT_DIRS = ['.omp/extensions', '.omp'] as const;
export const OMP_USER_FILES = ['.omp/agent/extensions', '.omp/settings.json'] as const;
export const OMP_EXECUTABLES = ['omp'] as const;

export async function detectOmp(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const project = await checkProjectEvidence(projectRoot, OMP_PROJECT_FILES, OMP_PROJECT_DIRS);
  const machine = await checkUserEvidence(OMP_USER_FILES, userHome);
  return [...project, ...machine];
}
