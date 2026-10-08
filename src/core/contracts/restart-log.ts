import { z } from 'zod/mini';
import { RESTART_REASON_CODES } from './auto-restart.js';
import { HARNESS_IDS } from './harness.js';

export const RESTART_LOG_MAX_RECORDS = 50;
export const RESTART_LOG_VERSION = 2;
export const RESTART_LOG_RELATIVE_DIR = '.context-brake/runtime/restart';
export const UNKNOWN_HARNESS_VERSION = 'unknown';

export const restartLogRecordSchema = z.strictObject({ at: z.string().check(z.minLength(1)), code: z.enum(RESTART_REASON_CODES) });
export type RestartLogRecord = z.infer<typeof restartLogRecordSchema>;

export const restartLogSchema = z.strictObject({
  v: z.literal(RESTART_LOG_VERSION),
  harness: z.enum(HARNESS_IDS),
  componentVersion: z.string(),
  harnessVersion: z.string(),
  records: z.array(restartLogRecordSchema).check(z.maxLength(RESTART_LOG_MAX_RECORDS)),
});
export type RestartLog = z.infer<typeof restartLogSchema>;
