import { z } from 'zod';

export const FIX_GROUPS = ['automatic', 'decision', 'manual'] as const;
export const FIX_OUTCOMES = ['fixed', 'skipped', 'manual', 'failed', 'planned'] as const;

export type FixGroup = (typeof FIX_GROUPS)[number];
export type FixOutcome = (typeof FIX_OUTCOMES)[number];
export type FixGroupMap = Readonly<Partial<Record<string, FixGroup>>>;

export const fixFieldSchema = z.object({ group: z.enum(FIX_GROUPS) }).strict();
