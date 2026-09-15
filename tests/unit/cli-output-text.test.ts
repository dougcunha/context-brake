import { describe, expect, it, vi } from 'vitest';
import { renderCliErrorText, renderDoctorText, renderInstallText } from '../../src/cli/output/text.js';
import type { CliErrorDocument, DoctorReport, InstallReport } from '../../src/core/contracts/diagnostics.js';

describe('CLI text install report', () => {
  it('renders install report with findings, conflicts, changes, and next steps', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const report: InstallReport = {
      schemaVersion: 1, command: 'init', mode: 'applied', status: 'errors', exitCode: 2,
      detections: [], plan: {
        schemaVersion: 1, projectRoot: '/test', requiresConfirmation: true,
        changes: [{ path: 'file.txt', realPath: '/test/file.txt', kind: 'create', owner: 'config', beforeSha256: null, afterSha256: 'abc', preview: { summary: 'create file' } }],
        conflicts: [{ path: 'conflict.txt', code: 'MODIFIED_FILE', detail: 'conflict detail' }],
        harnesses: [{ harness: 'claude-code', outcome: 'planned', supportLevel: 'full', limitations: [{ capability: 'context_usage', impact: 'estimated from the status line' }] }],
      },
      outcomes: [], findings: [{ code: 'TEST_WARN', severity: 'warning', scope: 'file', harness: 'claude-code', path: 'file.txt', message: 'test warning', impact: 'high', remediation: 'fix it' }],
    };
    renderInstallText(report);
    const text = stderrSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(text).toContain('- claude-code: full support (planned)');
    expect(text).toContain('* context_usage: estimated from the status line');
    expect(stderrSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});

describe('CLI text success hint', () => {
  it('renders success install report and next step hint', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const report: InstallReport = {
      schemaVersion: 1, command: 'init', mode: 'applied', status: 'success', exitCode: 0,
      detections: [], plan: {
        schemaVersion: 1, projectRoot: '/test', requiresConfirmation: false,
        changes: [{ path: 'file.txt', realPath: '/test/file.txt', kind: 'create', owner: 'config', beforeSha256: null, afterSha256: 'abc', preview: { summary: 'create file' } }],
        conflicts: [], harnesses: [],
      },
      outcomes: [], findings: [],
    };
    renderInstallText(report);
    expect(stdoutSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });
});

describe('CLI text doctor report', () => {
  it('renders doctor report and CLI error document', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const docReport: DoctorReport = {
      schemaVersion: 1, command: 'doctor', status: 'healthy', exitCode: 0,
      detections: [], integrations: [{
        harness: 'claude-code', state: 'installed', version: '1.2.3',
        support: { harness: 'claude-code', supportLevel: 'full', minimumVersion: null, capabilities: [], limitations: [{ capability: 'context_usage', impact: 'estimated from hooks' }] },
        overhead: { harness: 'claude-code', executionModel: 'process', sampleCount: 20, p95Milliseconds: 12, targetMilliseconds: 100, status: 'pass' },
      }],
      findings: [{ code: 'OK_FINDING', severity: 'ok', scope: 'project', harness: null, path: null, message: 'all good', impact: null, remediation: null }],
    };
    renderDoctorText(docReport);
    const doctorText = stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(doctorText).toContain('* context_usage: estimated from hooks');
    expect(stdoutSpy).toHaveBeenCalled();
    const errDoc: CliErrorDocument = { schemaVersion: 1, command: 'init', status: 'error', exitCode: 64, error: { code: 'INVALID_ARGUMENTS', message: 'bad flag' } };
    renderCliErrorText(errDoc);
    expect(stderrSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});

describe('CLI text error status', () => {
  it('renders warning install report and error doctor report', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const warnInstall: InstallReport = {
      schemaVersion: 1, command: 'remove', mode: 'dry_run', status: 'warnings', exitCode: 1,
      detections: [], plan: { schemaVersion: 1, projectRoot: '/test', changes: [], conflicts: [], harnesses: [], requiresConfirmation: false },
      outcomes: [], findings: [{ code: 'TEST_ERR', severity: 'error', scope: 'file', harness: null, path: null, message: 'err msg', impact: null, remediation: null }],
    };
    renderInstallText(warnInstall);
    const errDoctor: DoctorReport = {
      schemaVersion: 1, command: 'doctor', status: 'errors', exitCode: 2,
      detections: [], integrations: [{ harness: 'opencode', state: 'broken', version: null, support: { harness: 'opencode', supportLevel: 'partial', minimumVersion: null, capabilities: [], limitations: [] }, overhead: null }],
      findings: [{ code: 'VERSION_FLOOR_UNVERIFIED', severity: 'warning', scope: 'harness', harness: 'opencode', path: null, message: 'The minimum verified version for opencode is unknown.', impact: 'Version compatibility cannot be verified.', remediation: 'Confirm the installed harness version.' }],
    };
    renderDoctorText(errDoctor);
    const doctorOutput = stderrSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(doctorOutput).toContain('[WARN] VERSION_FLOOR_UNVERIFIED');
    expect(doctorOutput).toContain('Remediation: Confirm the installed harness version.');
    expect(stdoutSpy).toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});
