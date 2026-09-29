import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { ContextWindowReport } from '../contracts/context-window-report.js';
import type { DiagnosticFinding, DoctorReport, HarnessDiagnostic } from '../contracts/diagnostics.js';
import { brakeWindowReport, bridgeAbsentFindings } from './brake-window-report.js';
import { checkpointModeReport } from './delegated-diagnostics.js';
import { isDebugModeInEffect } from './debug-mode-merge.js';
import type { BuildDoctorReportInput } from './report-service.js';

export type DoctorExtrasInput = {
  readonly config: ContextBrakeConfig | null;
  readonly planPresent: boolean;
  readonly contextWindow: ContextWindowReport | undefined;
  readonly sessions: DoctorReport['activeSessions'];
  readonly integrations: readonly HarnessDiagnostic[];
};

export function doctorReportExtras(input: DoctorExtrasInput, findings: readonly DiagnosticFinding[]): Omit<BuildDoctorReportInput, 'detections' | 'integrations'> {
  const brakeWindow = input.config?.lightMode === undefined ? brakeWindowReport({ config: input.config, integrations: input.integrations, bridge: input.contextWindow?.bridge }) : undefined;
  return {
    findings: [...findings, ...bridgeAbsentFindings(brakeWindow ?? [], input.contextWindow?.bridge)],
    checkpointMode: checkpointModeReport(input.config, input.planPresent), contextWindow: input.contextWindow, activeSessions: input.sessions,
    debugMode: isDebugModeInEffect(input.config), brakeWindow,
  };
}
