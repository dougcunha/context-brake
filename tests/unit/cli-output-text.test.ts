import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderCliErrorText, renderDoctorText, renderFinding } from '../../src/cli/output/text.js';
import type { CliErrorDocument, DiagnosticFinding, DoctorReport } from '../../src/core/contracts/diagnostics.js';

type CapturedStreams = { stdout: () => string; stderr: () => string };

function writtenText(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((call) => String(call[0])).join('');
}

function captureStreams(): CapturedStreams {
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return { stdout: () => writtenText(stdout), stderr: () => writtenText(stderr) };
}

function finding(severity: DiagnosticFinding['severity']): DiagnosticFinding {
  return { code: 'TEST_FINDING', severity, scope: 'file', harness: null, path: null, message: 'finding message', impact: null, remediation: null };
}

function doctorReport(overrides: Partial<DoctorReport>): DoctorReport {
  return { schemaVersion: 1, command: 'doctor', status: 'healthy', exitCode: 0, detections: [], integrations: [], findings: [], ...overrides };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('CLI doctor status text', () => {
  it('labels a warnings report on stdout', () => {
    const streams = captureStreams();
    renderDoctorText(doctorReport({ status: 'warnings', exitCode: 1 }));
    expect(streams.stdout()).toBe('[WARN] ContextBrake doctor: warnings\n');
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
    [1000000, '  - context window: statusline (mod: absent, bridge: installed, last window: 1000000)\n'],
    [null, '  - context window: statusline (mod: absent, bridge: installed, last window: unknown)\n'],
  ])('renders the context window line for last window %s (FR-07, DEC-10, TC-17)', (lastWindowTokens, expected) => {
    const streams = captureStreams();
    renderDoctorText(doctorReport({ contextWindow: { bridge: 'installed', mod: 'absent', source: 'statusline', lastWindowTokens } }));
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
