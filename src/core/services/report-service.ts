import {
  cliErrorSchema, doctorReportSchema, installReportSchema, type CLI_ERROR_CODES, type CLI_ERROR_COMMANDS,
  type CheckpointModeReport, type CliErrorDocument, type DiagnosticFinding, type DoctorReport,
  type HarnessDiagnostic, type InstallReport,
} from '../contracts/diagnostics.js';
import type { ApplyOutcome, ChangePlan } from '../contracts/changes.js';
import type { ContextWindowReport } from '../contracts/context-window-report.js';
import type { HarnessDetection } from '../contracts/harness.js';

const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, ok: 2 };

export function sortFindings(findings: readonly DiagnosticFinding[]): DiagnosticFinding[] {
  return [...findings].sort((a, b) => {
    const sev = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
    if (sev !== 0) return sev;
    const code = a.code.localeCompare(b.code);
    if (code !== 0) return code;
    return (a.path ?? '').localeCompare(b.path ?? '');
  });
}

function deriveInstallStatus(outcomes: readonly ApplyOutcome[], findings: readonly DiagnosticFinding[]) {
  const hasError = findings.some((f) => f.severity === 'error') || outcomes.some((o) => o.status === 'failed');
  if (hasError) return { status: 'errors' as const, exitCode: 2 as const };
  const hasWarn = findings.some((f) => f.severity === 'warning') || outcomes.some((o) => o.status === 'skipped');
  if (hasWarn) return { status: 'warnings' as const, exitCode: 1 as const };
  return { status: 'success' as const, exitCode: 0 as const };
}

function deriveDoctorStatus(findings: readonly DiagnosticFinding[]) {
  if (findings.some((f) => f.severity === 'error')) return { status: 'errors' as const, exitCode: 2 as const };
  if (findings.some((f) => f.severity === 'warning')) return { status: 'warnings' as const, exitCode: 1 as const };
  return { status: 'healthy' as const, exitCode: 0 as const };
}

function cleanPlan(plan: ChangePlan) {
  return {
    schemaVersion: 1 as const,
    projectRoot: plan.projectRoot,
    changes: plan.changes.map((c) => ({
      path: c.path, realPath: c.realPath, kind: c.kind, owner: c.owner,
      beforeSha256: c.beforeSha256, afterSha256: c.afterSha256, preview: c.preview,
    })),
    conflicts: [...plan.conflicts],
    harnesses: [...plan.harnesses],
    requiresConfirmation: plan.requiresConfirmation,
  };
}

export type BuildInstallReportInput = {
  command: 'init' | 'remove'; mode: 'dry_run' | 'applied';
  detections: readonly HarnessDetection[]; plan: ChangePlan;
  outcomes: readonly ApplyOutcome[]; findings: readonly DiagnosticFinding[];
};

export function buildInstallReport(input: BuildInstallReportInput): InstallReport {
  const { status, exitCode } = deriveInstallStatus(input.outcomes, input.findings);
  const doc = {
    schemaVersion: 1 as const, command: input.command, mode: input.mode, status, exitCode,
    detections: [...input.detections], plan: cleanPlan(input.plan),
    outcomes: [...input.outcomes], findings: sortFindings(input.findings),
  };
  return installReportSchema.parse(doc);
}

export type BuildDoctorReportInput = {
  detections: readonly HarnessDetection[]; integrations: readonly HarnessDiagnostic[]; findings: readonly DiagnosticFinding[];
  checkpointMode?: CheckpointModeReport | undefined;
  contextWindow?: ContextWindowReport | undefined;
};

export function buildDoctorReport(input: BuildDoctorReportInput): DoctorReport {
  const { status, exitCode } = deriveDoctorStatus(input.findings);
  const doc = {
    schemaVersion: 1 as const, command: 'doctor' as const, status, exitCode,
    detections: [...input.detections], integrations: [...input.integrations], findings: sortFindings(input.findings),
    ...(input.checkpointMode === undefined ? {} : { checkpointMode: input.checkpointMode }),
    ...(input.contextWindow === undefined ? {} : { contextWindow: input.contextWindow }),
  };
  return doctorReportSchema.parse(doc);
}

export type BuildCliErrorInput = {
  command: (typeof CLI_ERROR_COMMANDS)[number];
  code: 'INVALID_ARGUMENTS' | 'INTERRUPTED' | (typeof CLI_ERROR_CODES)[number];
  message: string;
};

export function buildCliErrorDocument(input: BuildCliErrorInput): CliErrorDocument {
  const exitCode = input.code === 'INVALID_ARGUMENTS' ? 64 : input.code === 'INTERRUPTED' ? 130 : 2;
  const doc = {
    schemaVersion: 1 as const, command: input.command, status: 'error' as const, exitCode,
    error: { code: input.code, message: input.message },
  };
  return cliErrorSchema.parse(doc);
}
