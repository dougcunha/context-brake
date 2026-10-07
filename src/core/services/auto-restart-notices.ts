import { MOD_LOG_MAX_RECORDS, type RestartLogRecord, type RestartReasonCode } from '../contracts/auto-restart.js';

const SEED_BASE = 'ContextBrake: this session was restarted automatically. Continue the previous work from the state it recorded.';
const SKIPPED = 'ContextBrake: automatic restart skipped: ';

const NOTICES: Readonly<Record<RestartReasonCode, string | undefined>> = {
  RESTARTED: 'ContextBrake: restarting the session now (restart signal received).',
  SKIP_NO_SIGNAL: undefined,
  SKIP_DISABLED_ENV: `${SKIPPED}switched off by CONTEXT_BRAKE_AUTO_RESTART=0 or DISABLE_AUTO_COMPACT.`,
  SKIP_NON_INTERACTIVE: `${SKIPPED}there is no interactive terminal to continue the session.`,
  PAUSED_LOOP_GUARD: `${SKIPPED}the limit of consecutive restarts was reached. Send a message to resume.`,
  SKIP_NO_PROGRESS: `${SKIPPED}the previous restart made no progress.`,
  ERROR_CLEAR_REJECTED: `${SKIPPED}Claude Code rejected the clear. This session keeps running.`,
  ERROR_INTERNAL: `${SKIPPED}an internal error occurred. This session keeps running.`,
};

export function seedText(): string {
  return SEED_BASE;
}

export function renderRestartNotice(code: RestartReasonCode): string | undefined {
  return NOTICES[code];
}

export function buildLogRecord(code: RestartReasonCode, at: string): RestartLogRecord {
  return { at, code };
}

export function appendLogRecord(records: readonly RestartLogRecord[], record: RestartLogRecord): readonly RestartLogRecord[] {
  return [...records, record].slice(-MOD_LOG_MAX_RECORDS);
}
