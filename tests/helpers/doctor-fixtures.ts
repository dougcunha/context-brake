import type { DiagnosticFinding, DoctorReport } from '../../src/core/contracts/diagnostics.js';

export function doctorFinding(code: string, severity: DiagnosticFinding['severity'], extra: Partial<DiagnosticFinding> = {}): DiagnosticFinding {
  return { code, severity, scope: 'project', harness: null, path: null, message: `${code} message`, impact: null, remediation: null, ...extra };
}

export function doctorReport(overrides: Partial<DoctorReport>): DoctorReport {
  return { schemaVersion: 1, command: 'doctor', status: 'healthy', exitCode: 0, detections: [], integrations: [], findings: [], ...overrides };
}
