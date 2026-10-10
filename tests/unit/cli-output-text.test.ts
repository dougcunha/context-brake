import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderCliErrorText, renderDoctorText, renderFinding, renderInstallText } from '../../src/cli/output/text.js';
import type { CliErrorDocument, DiagnosticFinding, DoctorReport, InstallReport } from '../../src/core/contracts/diagnostics.js';

type PlannedFileChange = InstallReport['plan']['changes'][number];
type CapturedStreams = { stdout: () => string; stderr: () => string };

const CONFIG_CREATE: PlannedFileChange = { path: 'file.txt', realPath: '/test/file.txt', kind: 'create', owner: 'config', beforeSha256: null, afterSha256: 'abc', preview: { summary: 'create file' } };
const CONFIG_DELETE: PlannedFileChange = { path: 'context-brake.config.json', realPath: '/test/context-brake.config.json', kind: 'delete', owner: 'config', beforeSha256: 'abc', afterSha256: null, preview: { summary: 'Delete configuration file' } };

function writtenText(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((call) => String(call[0])).join('');
}

function captureStreams(): CapturedStreams {
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return { stdout: () => writtenText(stdout), stderr: () => writtenText(stderr) };
}

function installReport(overrides: Partial<InstallReport>, plan: Partial<InstallReport['plan']> = {}): InstallReport {
  return {
    schemaVersion: 1, command: 'init', mode: 'applied', status: 'success', exitCode: 0, detections: [], outcomes: [], findings: [],
    plan: { schemaVersion: 1, projectRoot: '/test', requiresConfirmation: false, changes: [], conflicts: [], harnesses: [], ...plan },
    ...overrides,
  };
}

function finding(severity: DiagnosticFinding['severity']): DiagnosticFinding {
  return { code: 'TEST_FINDING', severity, scope: 'file', harness: null, path: null, message: 'finding message', impact: null, remediation: null };
}

function doctorReport(overrides: Partial<DoctorReport>): DoctorReport {
  return { schemaVersion: 1, command: 'doctor', status: 'healthy', exitCode: 0, detections: [], integrations: [], findings: [], ...overrides };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('CLI install text', () => {
  it('prints the config summary under the config change for init (codereview_01 CR-02)', () => {
    const streams = captureStreams();
    renderInstallText(installReport({}, { changes: [CONFIG_CREATE] }));
    expect(streams.stdout()).toContain('    [create] file.txt (config)\n      create file\n');
  });
  it('prints no config summary line for remove (codereview_03 OI-04)', () => {
    const streams = captureStreams();
    renderInstallText(installReport({ command: 'remove' }, { changes: [CONFIG_DELETE] }));
    expect(streams.stdout()).toContain('    [delete] context-brake.config.json (config)\n');
    expect(streams.stdout()).not.toContain('Delete configuration file');
  });
  it('writes an errors report to stderr with the harness, limitation, conflict, and finding lines', () => {
    const streams = captureStreams();
    renderInstallText(installReport({ status: 'errors', exitCode: 2, findings: [finding('error')] }, {
      conflicts: [{ path: 'conflict.txt', code: 'MODIFIED_FILE', detail: 'conflict detail' }],
      harnesses: [{ harness: 'claude-code', outcome: 'planned', supportLevel: 'full', limitations: [{ capability: 'context_usage', impact: 'estimated from the status line' }] }],
    }));
    expect(streams.stderr()).toContain('  - claude-code: full support (planned)\n    * context_usage: estimated from the status line\n');
    expect(streams.stderr()).toContain('  Conflicts:\n    [ERROR] conflict.txt: conflict detail\n');
    expect(streams.stderr()).toContain('  [ERROR] TEST_FINDING: finding message\n');
  });
  it('labels warnings reports on stdout', () => {
    const streams = captureStreams();
    renderInstallText(installReport({ command: 'remove', mode: 'dry_run', status: 'warnings', exitCode: 1 }));
    renderDoctorText(doctorReport({ status: 'warnings', exitCode: 1 }));
    expect(streams.stdout()).toBe('[WARN] ContextBrake remove (dry_run)\n[WARN] ContextBrake doctor: warnings\n');
  });
});

describe('CLI doctor text', () => {
  it('prints the integration line with version, overhead, and limitations', () => {
    const streams = captureStreams();
    renderDoctorText(doctorReport({ integrations: [{
      harness: 'claude-code', state: 'installed', version: '1.2.3',
      support: { harness: 'claude-code', supportLevel: 'full', minimumVersion: null, capabilities: [], limitations: [{ capability: 'context_usage', impact: 'estimated from hooks' }] },
      overhead: { harness: 'claude-code', executionModel: 'process', sampleCount: 20, p95Milliseconds: 12, targetMilliseconds: 100, status: 'pass' },
    }] }));
    expect(streams.stdout()).toContain('  - claude-code: installed (support: full, version: 1.2.3, overhead: 12ms/100ms (pass))\n    * context_usage: estimated from hooks\n');
  });
  it('writes an errors report to stderr with the finding impact and remediation', () => {
    const streams = captureStreams();
    renderDoctorText(doctorReport({ status: 'errors', exitCode: 2, findings: [{ code: 'VERSION_FLOOR_UNVERIFIED', severity: 'warning', scope: 'harness', harness: 'opencode', path: null, message: 'The minimum verified version for opencode is unknown.', impact: 'Version compatibility cannot be verified.', remediation: 'Confirm the installed harness version.' }] }));
    expect(streams.stderr()).toContain('  [WARN] VERSION_FLOOR_UNVERIFIED: The minimum verified version for opencode is unknown.\n    Impact: Version compatibility cannot be verified.\n    Remediation: Confirm the installed harness version.\n');
  });
  it.each([
    ['ok', '[OK]'],
    ['error', '[ERROR]'],
  ] as const)('labels a %s finding as %s', (severity, label) => {
    expect(renderFinding(finding(severity))).toBe(`  ${label} TEST_FINDING: finding message`);
  });
  it.each([
    [1000000, '  - context window: statusline (bridge: installed, last window: 1000000)\n'],
    [null, '  - context window: statusline (bridge: installed, last window: unknown)\n'],
  ])('renders the context window line for last window %s (FR-07, DEC-10, TC-17)', (lastWindowTokens, expected) => {
    const streams = captureStreams();
    renderDoctorText(doctorReport({ contextWindow: { bridge: 'installed', source: 'statusline', lastWindowTokens } }));
    expect(streams.stdout()).toContain(expected);
  });
});

describe('CLI error text', () => {
  it('prints the error code and message on stderr', () => {
    const streams = captureStreams();
    const document: CliErrorDocument = { schemaVersion: 1, command: 'init', status: 'error', exitCode: 64, error: { code: 'INVALID_ARGUMENTS', message: 'bad flag' } };
    renderCliErrorText(document);
    expect(streams.stderr()).toBe('[ERROR] INVALID_ARGUMENTS: bad flag\n');
  });
});
