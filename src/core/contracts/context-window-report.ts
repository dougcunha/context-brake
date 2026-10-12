import { z } from 'zod';

export const CONTEXT_WINDOW_BRIDGE_STATES = ['absent', 'installed', 'inactive'] as const;
export const CONTEXT_MOD_STATES = ['absent', 'installed', 'reporting'] as const;
export const CONTEXT_WINDOW_SOURCES = ['mod', 'statusline', 'contextWindowCeiling'] as const;

export const contextWindowReportSchema = z.object({
  bridge: z.enum(CONTEXT_WINDOW_BRIDGE_STATES),
  mod: z.enum(CONTEXT_MOD_STATES),
  source: z.enum(CONTEXT_WINDOW_SOURCES),
  lastWindowTokens: z.number().int().positive().nullable(),
}).strict();

export type ContextWindowReport = z.infer<typeof contextWindowReportSchema>;
