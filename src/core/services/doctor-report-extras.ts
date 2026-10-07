import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { ContextWindowReport } from '../contracts/context-window-report.js';
import type { DiagnosticFinding, DoctorReport, SnapshotReport } from '../contracts/diagnostics.js';
import { isDebugModeInEffect } from './debug-mode-merge.js';
import type { BuildDoctorReportInput } from './report-service.js';

export type DoctorExtrasInput = {
  readonly config: ContextBrakeConfig | null;
  readonly planPresent: boolean;
  readonly contextWindow: ContextWindowReport | undefined;
  readonly sessions: DoctorReport['activeSessions'];
};

export function doctorReportExtras(input: DoctorExtrasInput, findings: readonly DiagnosticFinding[]): Omit<BuildDoctorReportInput, 'detections' | 'integrations'> {
  return {
    findings: [...findings, ...bridgeAbsentFindings(input.contextWindow)],
    snapshot: snapshotReport(input.config), contextWindow: input.contextWindow, activeSessions: input.sessions,
    debugMode: isDebugModeInEffect(input.config),
  };
}
function snapshotReport(config: ContextBrakeConfig | null): SnapshotReport | undefined {
  if (config === null) return undefined;
  return { triggerZone: config.snapshot.triggerZone, command: config.snapshot.command ?? null, resumeCommand: config.snapshot.resumeCommand ?? null };
}
function bridgeAbsentFindings(contextWindow: ContextWindowReport | undefined): DiagnosticFinding[] {
  if (contextWindow?.bridge !== 'absent') return [];
  return [{
    code: 'STATUSLINE_BRIDGE_ABSENT', severity: 'warning', scope: 'harness', harness: 'claude-code', path: null,
    message: 'The Claude Code status line bridge is not installed, so Claude Code telemetry is estimated.',
    impact: 'The context window falls back to contextWindowCeiling, so zones can differ from the real usage.',
    remediation: 'Run context-brake init. After --no-statusline-bridge, run context-brake init --statusline-bridge.',
  }];
}
