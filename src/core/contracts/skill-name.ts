import { z } from 'zod/mini';

export const MAX_SKILL_NAME_LENGTH = 64;
const NAME_SEGMENT = '[a-z0-9]+(?:-[a-z0-9]+)*';
const NAMESPACE_SEPARATOR = ':';
const INVOCATION_CHARACTERS = ['/', '$', '@'];
const MAX_QUALIFIED_LENGTH = MAX_SKILL_NAME_LENGTH * 2 + NAMESPACE_SEPARATOR.length;

function segmentFits(end: string): string {
  return `(?=[^${NAMESPACE_SEPARATOR}]{1,${MAX_SKILL_NAME_LENGTH}}${end})`;
}

const PREFIX = `(?:${segmentFits(NAMESPACE_SEPARATOR)}${NAME_SEGMENT}${NAMESPACE_SEPARATOR})?`;
const SKILL_NAME_PATTERN = new RegExp(`^${PREFIX}${segmentFits('$')}${NAME_SEGMENT}$`);
const SHAPE_RULE = `lowercase letters, digits, and single hyphens, up to ${MAX_SKILL_NAME_LENGTH} characters, optionally prefixed by a plugin name and a colon`;

export function isSkillName(value: string): boolean {
  return SKILL_NAME_PATTERN.test(value);
}

export function skillNameProblem(value: string): string | null {
  if (value === '') return 'must not be empty';
  if (isSkillName(value)) return null;
  const bare = INVOCATION_CHARACTERS.includes(value.charAt(0)) ? value.slice(1) : null;
  if (bare !== null && isSkillName(bare)) return `"${value}" is not a skill name; use the bare name ${bare}`;
  return `"${value}" is not a skill name; use ${SHAPE_RULE}`;
}

export const skillNameSchema = z.string().check((ctx) => {
  const message = skillNameProblem(ctx.value);
  if (message !== null) ctx.issues.push({ code: 'custom', input: ctx.value, message });
});

z.globalRegistry.add(skillNameSchema, { pattern: SKILL_NAME_PATTERN.source, maxLength: MAX_QUALIFIED_LENGTH });
