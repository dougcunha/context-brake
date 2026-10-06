import { MOD_LOG_MAX_RECORDS, type RestartLogRecord, type RestartReasonCode } from '../contracts/auto-restart.js';
import type { RestartGate } from './auto-restart-policy.js';

const SEED_BASE = 'ContextBrake: this session was restarted automatically. Continue the previous work from the state it recorded.';
const SEED_BOOT_SENTENCE = ' Follow the boot summary above.';
const SKIPPED = 'ContextBrake: automatic restart skipped: ';

const NOTICES: Readonly<Record<RestartReasonCode, string | undefined>> = {
  RESTARTED: 'ContextBrake: restarting the session now (restart signal received).',
  SKIP_NO_SIGNAL: undefined,
  SKIP_DISABLED_ENV: `${SKIPPED}switched off by CONTEXT_BRAKE_AUTO_RESTART=0 or DISABLE_AUTO_COMPACT.`,
  SKIP_RUNNER_SESSION: `${SKIPPED}this session belongs to context-brake run.`,
  SKIP_NON_INTERACTIVE: `${SKIPPED}there is no interactive terminal to continue the session.`,
  SKIP_CHECKPOINT_MISSING: `${SKIPPED}no checkpoint file to restart from.`,
  SKIP_CHECKPOINT_INVALID: `${SKIPPED}the checkpoint file is not valid. Run context-brake doctor.`,
  SKIP_CHECKPOINT_STALE: `${SKIPPED}the checkpoint is older than this turn.`,
  SKIP_NO_ACTIVE_STEP: `${SKIPPED}the checkpoint names no active plan step.`,
  PAUSED_LOOP_GUARD: `${SKIPPED}the limit of consecutive restarts was reached. Send a message to resume.`,
  SKIP_NO_PROGRESS: `${SKIPPED}the previous restart made no progress.`,
  ERROR_CLEAR_REJECTED: `${SKIPPED}Claude Code rejected the clear. This session keeps running.`,
  ERROR_INTERNAL: `${SKIPPED}an internal error occurred. This session keeps running.`,
};

export function seedText(gate: RestartGate): string {
  return gate === 'checkpoint' ? `${SEED_BASE}${SEED_BOOT_SENTENCE}` : SEED_BASE;
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
