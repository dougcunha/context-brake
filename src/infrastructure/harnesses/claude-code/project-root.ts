import { assetProjectRoot, projectRootFromEnvironment } from '../common/runtime-support.js';

export const PROJECT_DIRECTORY_VARIABLE = 'CLAUDE_PROJECT_DIR';

export async function resolveClaudeProjectRoot(): Promise<string> {
  return projectRootFromEnvironment([PROJECT_DIRECTORY_VARIABLE]) ?? await assetProjectRoot();
}
