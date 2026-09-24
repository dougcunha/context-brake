import { z } from 'zod/mini';
import { HARNESS_IDS } from './harness.js';
import { PLAN_STEP_STATUSES, stepIdSchema } from './task-plan.js';
import { USAGE_SOURCES, ZONES } from './zones.js';

export const RUN_RECORD_VERSION = 1;
export const APPROVALS_FILE_VERSION = 1;
export const SESSION_END_REASONS = ['reset_signal', 'harness_exit', 'harness_error', 'critical_ceiling', 'session_timeout', 'run_timeout', 'token_limit', 'interrupted'] as const;
export const RUN_STOP_REASONS = ['completed', 'limit_reached', 'repeated_failure', 'no_checkpoint', 'harness_error', 'step_not_approved', 'confirmation_required', 'interrupted'] as const;
export const VALIDATION_STATUSES = ['passed', 'failed', 'timed_out', 'not_run'] as const;
export const TOKEN_SOURCES = USAGE_SOURCES;
export const RUN_LIMITS = ['maxSessions', 'maxTotalMinutes', 'maxSessionMinutes', 'maxTotalTokens'] as const;
export const RUN_OUTCOMES = ['completed', 'stopped', 'interrupted'] as const;
export const RUN_STATUSES = ['running', ...RUN_OUTCOMES] as const;

export type SessionEndReason = (typeof SESSION_END_REASONS)[number];
export type RunStopReason = (typeof RUN_STOP_REASONS)[number];
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];
export type TokenSource = (typeof TOKEN_SOURCES)[number];
export type RunLimit = (typeof RUN_LIMITS)[number];
export type RunOutcome = (typeof RUN_OUTCOMES)[number];
export type RunStatus = (typeof RUN_STATUSES)[number];

const timestamp = z.string().check(z.minLength(1));
const count = z.int().check(z.nonnegative());
const sha256Hex = z.string().check(z.regex(/^[0-9a-f]{64}$/));

export const tokenCountSchema = z.strictObject({ value: count, source: z.enum(TOKEN_SOURCES) });
export const validationRecordSchema = z.strictObject({ status: z.enum(VALIDATION_STATUSES), exitCode: z.nullable(z.int()), durationMs: z.nullable(count) });
export const statusCorrectionSchema = z.strictObject({ stepId: stepIdSchema, from: z.enum(PLAN_STEP_STATUSES), to: z.enum(PLAN_STEP_STATUSES) });

export const runSessionLineSchema = z.strictObject({
  v: z.literal(RUN_RECORD_VERSION),
  index: z.int().check(z.positive()),
  harness: z.enum(HARNESS_IDS),
  sessionId: z.nullable(z.string().check(z.minLength(1))),
  stepId: stepIdSchema,
  startedAt: timestamp,
  endedAt: timestamp,
  durationMs: count,
  endReason: z.enum(SESSION_END_REASONS),
  streamParseErrors: z.optional(count),
  validation: validationRecordSchema,
  bootTokens: tokenCountSchema,
  sessionTokens: tokenCountSchema,
  finalZone: z.nullable(z.enum(ZONES)),
  statusCorrections: z.array(statusCorrectionSchema),
});

export const activeSessionSchema = z.strictObject({ harness: z.enum(HARNESS_IDS), sessionId: z.string().check(z.minLength(1)), agentId: z.null() });
export const runCountersSchema = z.strictObject({ sessions: count, stepsCompleted: count, consecutiveFailures: count, tokens: tokenCountSchema });

export const runRecordSchema = z.strictObject({
  v: z.literal(RUN_RECORD_VERSION),
  runId: z.string().check(z.minLength(1)),
  harness: z.enum(HARNESS_IDS),
  status: z.enum(RUN_STATUSES),
  stopReason: z.nullable(z.enum(RUN_STOP_REASONS)),
  limit: z.nullable(z.enum(RUN_LIMITS)),
  startedAt: timestamp,
  endedAt: z.nullable(timestamp),
  resumedFrom: z.nullable(z.string().check(z.minLength(1))),
  activeSession: z.nullable(activeSessionSchema),
  counters: runCountersSchema,
});

export const approvalsFileSchema = z.strictObject({
  v: z.literal(APPROVALS_FILE_VERSION),
  approved: z.array(z.strictObject({ hash: sha256Hex, stepId: stepIdSchema, approvedAt: timestamp })),
});

export type TokenCount = z.infer<typeof tokenCountSchema>;
export type ValidationRecord = z.infer<typeof validationRecordSchema>;
export type StatusCorrection = z.infer<typeof statusCorrectionSchema>;
export type RunSessionLine = z.infer<typeof runSessionLineSchema>;
export type ActiveSession = z.infer<typeof activeSessionSchema>;
export type RunCounters = z.infer<typeof runCountersSchema>;
export type RunRecord = z.infer<typeof runRecordSchema>;
export type ApprovalsFile = z.infer<typeof approvalsFileSchema>;
