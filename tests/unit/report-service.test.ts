import { describe, expect, it } from 'vitest';
import type { ApplyOutcome, ChangePlan } from '../../src/core/contracts/changes.js';
import type { DiagnosticFinding } from '../../src/core/contracts/diagnostics.js';
import { buildCliErrorDocument, buildDoctorReport, buildInstallReport, sortFindings } from '../../src/core/services/report-service.js';

const WARNING_FINDING: DiagnosticFinding = {
  code: 'HARNESS_WARNING', severity: 'warning', scope: 'harness', harness: 'github-copilot-cli',
  path: null, message: 'Harness github-copilot-cli has an active limitation.',
  impact: 'A hook timeout lets the tool call proceed.', remediation: null,
};
const ERROR_FINDING: DiagnosticFinding = {
  code: 'INTEGRATION_MISSING', severity: 'error', scope: 'harness', harness: 'claude-code',
  path: '.claude/settings.json', message: 'The claude-code integration is missing.',
  impact: 'ContextBrake cannot stop or annotate tool calls in this harness.',
  remediation: 'Run context-brake init --harness claude-code --yes.',
};
const FLOOR_FINDING: DiagnosticFinding = { code: 'VERSION_FLOOR_UNVERIFIED', severity: 'warning', scope: 'harness', harness: 'claude-code', path: null, message: 'The minimum verified version for claude-code is unknown.', impact: 'Version compatibility cannot be verified.', remediation: 'Confirm the installed harness version and update ContextBrake.' };
const EMPTY_PLAN: ChangePlan = { schemaVersion: 1, projectRoot: '/test', changes: [], conflicts: [], harnesses: [], requiresConfirmation: false };

describe('UT-16: Canonical finding preservation (CA-17)', () => {
  it('preserves finding properties identically, errors first, in canonical doctor and install reports', () => {
    const docReport = buildDoctorReport({ detections: [], integrations: [], findings: [WARNING_FINDING, ERROR_FINDING] });
    const installReport = buildInstallReport({ command: 'init', mode: 'dry_run', detections: [], plan: EMPTY_PLAN, outcomes: [], findings: [WARNING_FINDING, ERROR_FINDING] });
    expect(docReport.findings).toEqual([ERROR_FINDING, WARNING_FINDING]);
    expect(installReport.findings).toEqual(docReport.findings);
  });
});

describe('UT-16: Finding severity sorting (CA-17)', () => {
  it('sorts findings by severity (error > warning > ok), then code, then path', () => {
    const okFinding: DiagnosticFinding = { ...WARNING_FINDING, code: 'A_OK', severity: 'ok' };
    const errorAtB: DiagnosticFinding = { ...ERROR_FINDING, path: 'b.json' };
    const errorAtA: DiagnosticFinding = { ...ERROR_FINDING, path: 'a.json' };
    const sorted = sortFindings([okFinding, FLOOR_FINDING, WARNING_FINDING, errorAtB, errorAtA]);
    expect(sorted).toEqual([errorAtA, errorAtB, WARNING_FINDING, FLOOR_FINDING, okFinding]);
  });
});

describe('TC-03: limitations create no finding and never change the exit code', () => {
  it('keeps a success install report when the only content is a harness limitation', () => {
    const report = buildInstallReport({
      command: 'init', mode: 'applied', detections: [], outcomes: [], findings: [],
      plan: {
        ...EMPTY_PLAN,
        harnesses: [{
          harness: 'github-copilot-cli', outcome: 'planned', supportLevel: 'full',
          limitations: [{ capability: 'context_usage', impact: 'Context usage is not exposed to GitHub Copilot CLI hooks.' }],
        }],
      },
    });
    expect(report.status).toBe('success');
    expect(report.exitCode).toBe(0);
    expect(report.findings).toEqual([]);
  });
});

describe('install report status from the apply outcomes', () => {
  it.each([
    ['failed', 'errors', 2],
    ['skipped', 'warnings', 1],
  ] as const)('reports a %s outcome as %s with exit code %i', (outcome, status, exitCode) => {
    const outcomes: ApplyOutcome[] = [{ path: '.claude/settings.json', status: outcome, detail: null }];
    const report = buildInstallReport({ command: 'init', mode: 'applied', detections: [], plan: EMPTY_PLAN, outcomes, findings: [] });
    expect(report).toMatchObject({ status, exitCode });
  });
});

describe('T12/CR-02: Doctor status honors warning and error precedence', () => {
  it('returns warnings/exit 1 for the unknown-floor warning and errors/exit 2 when an error exists', () => {
    const warningReport = buildDoctorReport({ detections: [], integrations: [], findings: [FLOOR_FINDING] });
    const errorReport = buildDoctorReport({ detections: [], integrations: [], findings: [WARNING_FINDING, ERROR_FINDING, FLOOR_FINDING] });
    expect(warningReport.status).toBe('warnings');
    expect(warningReport.exitCode).toBe(1);
    expect(errorReport.status).toBe('errors');
    expect(errorReport.exitCode).toBe(2);
    expect(errorReport.findings.some((f) => f.code === 'VERSION_FLOOR_UNVERIFIED')).toBe(true);
  });
});

describe('CLI error document exit codes', () => {
  it.each([
    ['INVALID_ARGUMENTS', 64],
    ['INTERRUPTED', 130],
    ['UNEXPECTED_ERROR', 2],
  ] as const)('maps %s to exit code %i', (code, exitCode) => {
    const document = buildCliErrorDocument({ command: 'doctor', code, message: 'stopped' });
    expect(document).toEqual({ schemaVersion: 1, command: 'doctor', status: 'error', exitCode, error: { code, message: 'stopped' } });
  });
});
