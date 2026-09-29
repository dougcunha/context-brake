import { z } from 'zod/mini';

export const STATUSLINE_MODEL_MAX_LENGTH = 200;
export const STATUSLINE_SHELLS = ['sh', 'git-bash', 'powershell'] as const;

export type StatuslineShell = (typeof STATUSLINE_SHELLS)[number];

export const statuslineLineSchema = z.strictObject({
  v: z.literal(1),
  type: z.literal('statusline'),
  at: z.string().check(z.minLength(1)),
  windowTokens: z.nullable(z.int().check(z.positive())),
  inputTokens: z.nullable(z.int().check(z.nonnegative())),
  usedPercentage: z.nullable(z.number().check(z.gte(0), z.lte(100))),
  model: z.nullable(z.string().check(z.maxLength(STATUSLINE_MODEL_MAX_LENGTH))),
  shell: z.optional(z.enum(STATUSLINE_SHELLS)),
});

export type StatuslineLine = z.infer<typeof statuslineLineSchema>;
export type StatuslineLineInput = Omit<StatuslineLine, 'v' | 'type' | 'at'>;
