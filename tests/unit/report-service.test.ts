import { describe, expect, it } from 'vitest';
import type { DiagnosticFinding } from '../../src/core/contracts/diagnostics.js';
import { buildDoctorReport, buildInstallReport, sortFindings } from '../../src/core/services/report-service.js';

const sampleFindings: readonly DiagnosticFinding[] = [
  {
    code: 'COPILOT_TIMEOUT_LIMITATION', severity: 'warning', scope: 'harness', harness: 'github-copilot-cli',
    path: null, message: 'Harness github-copilot-cli has an active limitation.',
    impact: 'A timed-out hook lets the tool call continue.', remediation: null,
  },
  {
    code: 'INTEGRATION_MISSING', severity: 'error', scope: 'harness', harness: 'claude-code',
    path: '.claude/settings.json', message: 'The claude-code integration is missing.',
    impact: 'ContextBrake cannot stop or annotate tool calls in this harness.',
    remediation: 'Run context-brake init --harness claude-code --yes.',
  },
];

describe('UT-16: Canonical finding preservation (CA-17)', () => {
  it('preserves finding properties identically in canonical doctor and install reports', () => {
    const docReport = buildDoctorReport({ detections: [], integrations: [], findings: sampleFindings });
    const installReport = buildInstallReport({
      command: 'init', mode: 'dry_run', detections: [],
      plan: { schemaVersion: 1, projectRoot: '/test', changes: [], conflicts: [], harnesses: [], requiresConfirmation: false },
      outcomes: [], findings: sampleFindings,
    });
    expect(docReport.findings).toHaveLength(2);
    expect(installReport.findings).toHaveLength(2);
    expect(docReport.findings[0]?.code).toBe('INTEGRATION_MISSING');
    expect(docReport.findings[0]?.severity).toBe('error');
    expect(docReport.findings[0]?.impact).toBe('ContextBrake cannot stop or annotate tool calls in this harness.');
    expect(docReport.findings[0]?.remediation).toBe('Run context-brake init --harness claude-code --yes.');
    expect(installReport.findings[0]).toEqual(docReport.findings[0]);
    expect(installReport.findings[1]).toEqual(docReport.findings[1]);
  });
});

describe('UT-16: Finding severity sorting (CA-17)', () => {
  it('sorts findings by severity (error > warning > ok) then code', () => {
    const sorted = sortFindings(sampleFindings);
    expect(sorted[0]?.severity).toBe('error');
    expect(sorted[1]?.severity).toBe('warning');
  });
});

const floorFinding: DiagnosticFinding = { code: 'VERSION_FLOOR_UNVERIFIED', severity: 'warning', scope: 'harness', harness: 'claude-code', path: null, message: 'The minimum verified version for claude-code is unknown.', impact: 'Version compatibility cannot be verified.', remediation: 'Confirm the installed harness version and update ContextBrake.' };

describe('T12/CR-02: Doctor status honors warning and error precedence', () => {
  it('returns warnings/exit 1 for the unknown-floor warning and errors/exit 2 when an error exists', () => {
    const warningReport = buildDoctorReport({ detections: [], integrations: [], findings: [floorFinding] });
    const errorReport = buildDoctorReport({ detections: [], integrations: [], findings: [...sampleFindings, floorFinding] });

    expect(warningReport.status).toBe('warnings');
    expect(warningReport.exitCode).toBe(1);
    expect(errorReport.status).toBe('errors');
    expect(errorReport.exitCode).toBe(2);
    expect(errorReport.findings.some((f) => f.code === 'VERSION_FLOOR_UNVERIFIED')).toBe(true);
  });
});
