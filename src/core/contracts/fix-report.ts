import { z } from 'zod';
import { CHANGE_KINDS, CHANGE_OWNERS, planConflictSchema } from './changes.js';
import { doctorReportSchema } from './diagnostics.js';
import { FIX_GROUPS, FIX_OUTCOMES } from './fix.js';
import { HARNESS_IDS } from './harness.js';

export const FIX_STOPS = ['not_installed', 'nothing_to_fix'] as const;
export type FixStop = (typeof FIX_STOPS)[number];

const code = z.string().regex(/^[A-Z0-9_]+$/);
const planChange = z.object({ path: z.string(), kind: z.enum(CHANGE_KINDS), owner: z.enum(CHANGE_OWNERS), summary: z.string() }).strict();
const outcome = z.object({ code, harness: z.enum(HARNESS_IDS).nullable(), path: z.string().nullable(), group: z.enum(FIX_GROUPS), outcome: z.enum(FIX_OUTCOMES), detail: z.string().nullable() }).strict();

export const fixReportSchema = z.object({
  schemaVersion: z.literal(1),
  command: z.literal('fix'),
  mode: z.enum(['dry_run', 'applied']),
  stopped: z.enum(FIX_STOPS).nullable(),
  status: z.enum(['healthy', 'warnings', 'errors']),
  exitCode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  plan: z.object({ changes: z.array(planChange), conflicts: z.array(planConflictSchema) }).strict(),
  outcomes: z.array(outcome),
  doctor: doctorReportSchema,
}).strict();

export type FixReport = z.infer<typeof fixReportSchema>;
export type FixOutcomeItem = FixReport['outcomes'][number];
export type FixPlanSummary = FixReport['plan'];
