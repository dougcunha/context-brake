import { z } from 'zod/mini';

export const DEFAULT_MAX_CONSECUTIVE_RESTARTS = 2;
export const MIN_CONSECUTIVE_RESTARTS = 1;
export const MAX_CONSECUTIVE_RESTARTS = 10;
export const MOD_LOG_MAX_RECORDS = 50;
export const MOD_LOG_VERSION = 1;

export const RESTART_REASON_CODES = [
  'RESTARTED', 'SKIP_NO_SIGNAL', 'SKIP_DISABLED_ENV', 'SKIP_RUNNER_SESSION', 'SKIP_NON_INTERACTIVE',
  'SKIP_CHECKPOINT_MISSING', 'SKIP_CHECKPOINT_INVALID', 'SKIP_CHECKPOINT_STALE', 'SKIP_NO_ACTIVE_STEP',
  'PAUSED_LOOP_GUARD', 'SKIP_NO_PROGRESS', 'ERROR_CLEAR_REJECTED', 'ERROR_INTERNAL',
] as const;
export type RestartReasonCode = (typeof RESTART_REASON_CODES)[number];

const consecutiveRestarts = z.int().check(z.minimum(MIN_CONSECUTIVE_RESTARTS), z.maximum(MAX_CONSECUTIVE_RESTARTS));

export const autoRestartSchema = z.strictObject({ maxConsecutiveRestarts: z._default(consecutiveRestarts, DEFAULT_MAX_CONSECUTIVE_RESTARTS) });
export type AutoRestartConfig = z.infer<typeof autoRestartSchema>;

export const restartLogRecordSchema = z.strictObject({ at: z.string().check(z.minLength(1)), code: z.enum(RESTART_REASON_CODES) });
export type RestartLogRecord = z.infer<typeof restartLogRecordSchema>;

export const modLogSchema = z.strictObject({
  v: z.literal(MOD_LOG_VERSION),
  modVersion: z.string(),
  claudeVersion: z.string(),
  records: z.array(restartLogRecordSchema).check(z.maxLength(MOD_LOG_MAX_RECORDS)),
});
export type ModLog = z.infer<typeof modLogSchema>;
