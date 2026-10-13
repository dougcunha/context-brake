import type { HarnessId } from '../../core/contracts/harness.js';
import type { SkillInvocationFormat } from '../../core/contracts/skill-invocation.js';
import { ANTIGRAVITY_SKILL_INVOCATION } from './antigravity-cli/skill-invocation.js';
import { CLAUDE_SKILL_INVOCATION } from './claude-code/skill-invocation.js';
import { CODEX_SKILL_INVOCATION } from './codex-cli/skill-invocation.js';
import { CURSOR_SKILL_INVOCATION } from './cursor/skill-invocation.js';
import { COPILOT_SKILL_INVOCATION } from './github-copilot-cli/skill-invocation.js';
import { OMP_SKILL_INVOCATION } from './oh-my-pi/skill-invocation.js';
import { OPENCODE_SKILL_INVOCATION } from './opencode/skill-invocation.js';
import { PI_SKILL_INVOCATION } from './pi/skill-invocation.js';

export const SKILL_INVOCATIONS: Readonly<Record<HarnessId, SkillInvocationFormat>> = {
  'claude-code': CLAUDE_SKILL_INVOCATION,
  'codex-cli': CODEX_SKILL_INVOCATION,
  cursor: CURSOR_SKILL_INVOCATION,
  'github-copilot-cli': COPILOT_SKILL_INVOCATION,
  opencode: OPENCODE_SKILL_INVOCATION,
  pi: PI_SKILL_INVOCATION,
  'oh-my-pi': OMP_SKILL_INVOCATION,
  'antigravity-cli': ANTIGRAVITY_SKILL_INVOCATION,
};

export function resolveSkillInvocation(harness: HarnessId): SkillInvocationFormat {
  return SKILL_INVOCATIONS[harness];
}
