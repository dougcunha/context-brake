import type { HarnessId } from './harness.js';

export type SkillInvocationFormat = (skill: string) => string;
export type SkillInvocationResolver = (harness: HarnessId) => SkillInvocationFormat;
