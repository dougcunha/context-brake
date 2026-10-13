import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { ContextWindowReport } from '../contracts/context-window-report.js';
import type { DiagnosticFinding, DoctorReport, SnapshotReport } from '../contracts/diagnostics.js';
import type { SkillInvocationResolver } from '../contracts/skill-invocation.js';
import { isDebugModeInEffect } from './debug-mode-merge.js';
import type { BuildDoctorReportInput } from './report-service.js';

export type DoctorExtrasInput = {
  readonly config: ContextBrakeConfig | null;
  readonly planPresent: boolean;
  readonly contextWindow: ContextWindowReport | undefined;
  readonly sessions: DoctorReport['activeSessions'];
  readonly invocations?: SkillInvocationResolver | undefined;
};

export function doctorReportExtras(input: DoctorExtrasInput, findings: readonly DiagnosticFinding[]): Omit<BuildDoctorReportInput, 'detections' | 'integrations'> {
  return {
    findings: [...findings, ...modFindings(input.contextWindow), ...bridgeAbsentFindings(input.contextWindow)],
    snapshot: snapshotReport(input.config, input.invocations), contextWindow: input.contextWindow, activeSessions: input.sessions,
    debugMode: isDebugModeInEffect(input.config),
  };
}
function snapshotReport(config: ContextBrakeConfig | null, resolve: SkillInvocationResolver | undefined): SnapshotReport | undefined {
  if (config === null) return undefined;
  const { triggerZone, command, resumeCommand } = config.snapshot;
  const report = { triggerZone, command: command ?? null, resumeCommand: resumeCommand ?? null };
  if (command === undefined || resolve === undefined) return report;
  return { ...report, invocations: config.activeHarnesses.map((harness) => ({ harness, command: resolve(harness)(command), resumeCommand: resumeCommand === undefined ? null : resolve(harness)(resumeCommand) })) };
}
function bridgeAbsentFindings(contextWindow: ContextWindowReport | undefined): DiagnosticFinding[] {
  if (contextWindow?.bridge !== 'absent' || contextWindow.mod !== 'absent') return [];
  return [{
    code: 'STATUSLINE_BRIDGE_ABSENT', severity: 'warning', scope: 'harness', harness: 'claude-code', path: null,
    message: 'The Claude Code status line bridge is not installed, so Claude Code telemetry is estimated.',
    impact: 'The context window falls back to contextWindowCeiling, so zones can differ from the real usage.',
    remediation: 'Run context-brake init. After --no-statusline-bridge, run context-brake init --statusline-bridge.',
  }];
}
function modFindings(contextWindow: ContextWindowReport | undefined): DiagnosticFinding[] {
  if (contextWindow?.mod === 'reporting') return [{ code: 'CONTEXT_MOD_READY', severity: 'ok', scope: 'harness', harness: 'claude-code', path: null, message: 'The Claude Code mod reports the context window.', impact: null, remediation: null }];
  if (contextWindow?.mod !== 'installed' || contextWindow.bridge === 'installed') return [];
  return [{
    code: 'CONTEXT_MOD_SILENT', severity: 'warning', scope: 'harness', harness: 'claude-code', path: null,
    message: 'The ContextBrake mod is installed, but no Claude Code session has reported the context yet.',
    impact: 'The context window falls back to contextWindowCeiling and usage to the transcript or an estimate.',
    remediation: 'Start Claude Code in this project and trust the folder. Mods stay off under disableAllHooks, --safe-mode, --bare, an organization managed policy, and in Desktop WSL sessions. Claude Code also keeps one marketplace named context-brake-local per user, so the mod of another repository can be the one that loads; run context-brake init in that repository too, or use the status line bridge with context-brake init --statusline-bridge.',
  }];
}
