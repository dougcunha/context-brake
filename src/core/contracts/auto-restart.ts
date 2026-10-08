import { z } from 'zod/mini';

export const DEFAULT_MAX_CONSECUTIVE_RESTARTS = 2;
export const MIN_CONSECUTIVE_RESTARTS = 1;
export const MAX_CONSECUTIVE_RESTARTS = 10;

export const RESTART_REASON_CODES = [
  'RESTARTED', 'SKIP_NO_SIGNAL', 'SKIP_DISABLED_ENV', 'SKIP_NON_INTERACTIVE', 'SKIP_HANDOFF_MISSING', 'SKIP_HANDOFF_STALE',
  'PAUSED_LOOP_GUARD', 'SKIP_NO_PROGRESS', 'ERROR_RESTART_REJECTED', 'ERROR_INTERNAL',
] as const;
export type RestartReasonCode = (typeof RESTART_REASON_CODES)[number];

const consecutiveRestarts = z.int().check(z.minimum(MIN_CONSECUTIVE_RESTARTS), z.maximum(MAX_CONSECUTIVE_RESTARTS));

export const autoRestartSchema = z.strictObject({ maxConsecutiveRestarts: z._default(consecutiveRestarts, DEFAULT_MAX_CONSECUTIVE_RESTARTS) });
export type AutoRestartConfig = z.infer<typeof autoRestartSchema>;
