import { z } from 'zod/mini';
import { RUN_LIMITS, RUN_OUTCOMES, RUN_STOP_REASONS, runSessionLineSchema, tokenCountSchema } from './run-records.js';
import { stepIdSchema } from './task-plan.js';

export const RUN_SUMMARY_SCHEMA_VERSION = 1;
const count = z.int().check(z.nonnegative());

export const decisionRequestSchema = z.strictObject({ reason: z.enum(RUN_STOP_REASONS), stepId: z.nullable(stepIdSchema), options: z.array(z.string().check(z.minLength(1))) });

export const runSummarySchema = z.strictObject({
  schemaVersion: z.literal(RUN_SUMMARY_SCHEMA_VERSION),
  command: z.literal('run'),
  runId: z.nullable(z.string().check(z.minLength(1))),
  status: z.enum(RUN_OUTCOMES),
  exitCode: z.int().check(z.nonnegative()),
  stopReason: z.enum(RUN_STOP_REASONS),
  limit: z.nullable(z.enum(RUN_LIMITS)),
  stepsCompleted: count,
  stepsTotal: count,
  sessionCount: count,
  durationMs: count,
  tokens: tokenCountSchema,
  harnessArgs: z.array(z.string()),
  sessions: z.array(runSessionLineSchema),
  decision: z.optional(decisionRequestSchema),
});

export type DecisionRequest = z.infer<typeof decisionRequestSchema>;
export type RunSummary = z.infer<typeof runSummarySchema>;
