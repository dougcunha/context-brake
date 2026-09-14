import type { DetectionEvidence } from '../../../core/contracts/harness.js';
import { checkProjectEvidence, checkUserEvidence } from '../common/path-helpers.js';

export const CODEX_PROJECT_FILES = [
  '.codex/hooks.json',
  '.codex/config.toml',
] as const;

export const CODEX_PROJECT_DIRS = ['.codex'] as const;
export const CODEX_USER_FILES = ['.codex/config.toml', '.codex/hooks.json'] as const;
export const CODEX_EXECUTABLES = ['codex'] as const;

export async function detectCodex(
  projectRoot: string,
  userHome?: string
): Promise<readonly DetectionEvidence[]> {
  const project = await checkProjectEvidence(projectRoot, CODEX_PROJECT_FILES, CODEX_PROJECT_DIRS);
  const machine = await checkUserEvidence(CODEX_USER_FILES, userHome);
  return [...project, ...machine];
}
