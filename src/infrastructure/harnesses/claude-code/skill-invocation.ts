import type { SkillInvocationFormat } from '../../../core/contracts/skill-invocation.js';
import { slashInvocation } from '../../../core/services/skill-invocation.js';

export const CLAUDE_SKILL_INVOCATION: SkillInvocationFormat = slashInvocation;
