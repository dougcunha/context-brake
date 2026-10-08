import type { HarnessAdapter } from '../contracts/adapter.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import { HANDOFF_ARCHIVE_RELATIVE_DIR, HANDOFF_RELATIVE_PATH } from '../contracts/handoff.js';
import { harnessRestartMode } from './restart-install-extras.js';
import { restartMode } from './restart-mode.js';

export type RestartDoctorInput = {
  readonly config: Pick<ContextBrakeConfig, 'autoRestart' | 'snapshot'> | null;
  readonly installed: readonly HarnessAdapter[];
  readonly handoffPending: boolean;
};

function semiAutomaticReady(adapter: HarnessAdapter): DiagnosticFinding[] {
  const { mode, reason } = harnessRestartMode(adapter.capabilityProfile());
  if (mode !== 'semi-automatic') return [];
  return [{ code: 'AUTO_RESTART_READY', severity: 'ok', scope: 'harness', harness: adapter.id, path: null, message: `Semi-automatic restart is ready on ${adapter.id}.`, impact: reason, remediation: null }];
}

function handoffFinding(config: Pick<ContextBrakeConfig, 'autoRestart' | 'snapshot'>, pending: boolean): DiagnosticFinding {
  const carrier = restartMode(config) === 'snapshot' ? `the snapshot command "${config.snapshot.command ?? ''}"` : `a markdown handoff in ${HANDOFF_RELATIVE_PATH}`;
  const state = pending ? 'A handoff is pending for the next session.' : 'No handoff is pending.';
  return { code: 'AUTO_RESTART_HANDOFF', severity: 'ok', scope: 'project', harness: null, path: pending ? HANDOFF_RELATIVE_PATH : null, message: `Restart carries the work forward through ${carrier}. ${state}`, impact: null, remediation: null };
}

export function restartDoctorFindings(input: RestartDoctorInput): DiagnosticFinding[] {
  if (input.config === null || input.config.autoRestart === undefined) return [];
  return [...input.installed.flatMap(semiAutomaticReady), handoffFinding(input.config, input.handoffPending)];
}

export function handoffKeptFinding(paths: readonly string[]): DiagnosticFinding[] {
  if (paths.length === 0) return [];
  return [{ code: 'AUTO_RESTART_HANDOFF_KEPT', severity: 'ok', scope: 'project', harness: null, path: paths[0] ?? null, message: `Session handoffs were kept: ${paths.join(', ')}.`, impact: null, remediation: `Delete ${HANDOFF_RELATIVE_PATH} and ${HANDOFF_ARCHIVE_RELATIVE_DIR}/ yourself if you no longer need them.` }];
}
