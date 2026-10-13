import type { HarnessId } from '../../core/contracts/harness.js';
import { CLAUDE_SKILL_FOLDERS } from './claude-code/skill-folders.js';
import { CODEX_SKILL_FOLDERS } from './codex-cli/skill-folders.js';
import { CURSOR_SKILL_FOLDERS } from './cursor/skill-folders.js';
import { COPILOT_SKILL_FOLDERS } from './github-copilot-cli/skill-folders.js';
import { OPENCODE_SKILL_FOLDERS } from './opencode/skill-folders.js';
import { PI_SKILL_FOLDERS } from './pi/skill-folders.js';
import { OMP_SKILL_FOLDERS } from './oh-my-pi/skill-folders.js';
import { ANTIGRAVITY_SKILL_FOLDERS } from './antigravity-cli/skill-folders.js';

export const SKILL_FOLDERS: Readonly<Record<HarnessId, readonly string[]>> = {
  'claude-code': CLAUDE_SKILL_FOLDERS,
  'codex-cli': CODEX_SKILL_FOLDERS,
  cursor: CURSOR_SKILL_FOLDERS,
  'github-copilot-cli': COPILOT_SKILL_FOLDERS,
  opencode: OPENCODE_SKILL_FOLDERS,
  pi: PI_SKILL_FOLDERS,
  'oh-my-pi': OMP_SKILL_FOLDERS,
  'antigravity-cli': ANTIGRAVITY_SKILL_FOLDERS,
};

export function resolveSkillFolders(harness: HarnessId): readonly string[] {
  return SKILL_FOLDERS[harness];
}
