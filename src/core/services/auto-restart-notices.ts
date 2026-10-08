import type { RestartReasonCode } from '../contracts/auto-restart.js';
import { RESTART_LOG_MAX_RECORDS, type RestartLogRecord } from '../contracts/restart-log.js';

const SEED_BASE = 'ContextBrake: this session was restarted automatically. Continue the previous work from the state it recorded.';
const SKIPPED = 'ContextBrake: automatic restart skipped: ';

const NOTICES: Readonly<Record<RestartReasonCode, string | undefined>> = {
  RESTARTED: 'ContextBrake: restarting the session now (restart signal received).',
  SKIP_NO_SIGNAL: undefined,
  SKIP_DISABLED_ENV: `${SKIPPED}switched off by CONTEXT_BRAKE_AUTO_RESTART=0 or a harness setting.`,
  SKIP_NON_INTERACTIVE: `${SKIPPED}there is no interactive terminal to continue the session.`,
  SKIP_HANDOFF_MISSING: `${SKIPPED}no handoff was written to .context-brake/handoff.md.`,
  SKIP_HANDOFF_STALE: `${SKIPPED}.context-brake/handoff.md was not updated in this turn.`,
  PAUSED_LOOP_GUARD: `${SKIPPED}the limit of consecutive restarts was reached. Send a message to resume.`,
  SKIP_NO_PROGRESS: `${SKIPPED}the previous restart made no progress.`,
  ERROR_RESTART_REJECTED: `${SKIPPED}the harness rejected the new session. This session keeps running.`,
  ERROR_INTERNAL: `${SKIPPED}an internal error occurred. This session keeps running.`,
};

export function seedText(resume: string | null = null): string {
  return resume === null ? SEED_BASE : `${SEED_BASE}\n\n${resume}`;
}

export function renderRestartNotice(code: RestartReasonCode): string | undefined {
  return NOTICES[code];
}

export function buildLogRecord(code: RestartReasonCode, at: string): RestartLogRecord {
  return { at, code };
}

export function appendLogRecord(records: readonly RestartLogRecord[], record: RestartLogRecord): readonly RestartLogRecord[] {
  return [...records, record].slice(-RESTART_LOG_MAX_RECORDS);
}
