import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatInstallReport, renderInstallText } from '../../src/cli/output/install-text.js';
import { createStyle, PLAIN_STYLE } from '../../src/cli/output/style.js';
import type { DiagnosticFinding, InstallReport } from '../../src/core/contracts/diagnostics.js';

const ESCAPE = String.fromCharCode(27);
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

afterEach(() => { vi.restoreAllMocks(); });

describe('CLI install text', () => {
  it('prints the config summary under the config change for init (codereview_01 CR-02)', () => {
    const streams = captureStreams();
    renderInstallText(installReport({}, { changes: [CONFIG_CREATE] }), PLAIN_STYLE);
    expect(streams.stdout()).toContain('│  create  file.txt (config)\n│          create file\n');
  });
  it('prints no config summary line for remove (codereview_03 OI-04)', () => {
    const streams = captureStreams();
    renderInstallText(installReport({ command: 'remove' }, { changes: [CONFIG_DELETE] }), PLAIN_STYLE);
    expect(streams.stdout()).toContain('│  delete  context-brake.config.json (config)\n');
    expect(streams.stdout()).not.toContain('Delete configuration file');
  });
  it('writes an errors report to stderr with the harness, limitation, conflict, and finding lines', () => {
    const streams = captureStreams();
    renderInstallText(installReport({ status: 'errors', exitCode: 2, findings: [finding('error')] }, {
      conflicts: [{ path: 'conflict.txt', code: 'MODIFIED_FILE', detail: 'conflict detail' }],
      harnesses: [{ harness: 'claude-code', outcome: 'planned', supportLevel: 'full', limitations: [{ capability: 'context_usage', impact: 'estimated from the status line' }] }],
    }), PLAIN_STYLE);
    expect(streams.stderr()).toContain(`│  claude-code  full support (planned)\n│${' '.repeat(15)}context_usage: estimated from the status line\n`);
    expect(streams.stderr()).toContain('┌─ Conflicts\n│  [ERROR]  conflict.txt: conflict detail\n');
    expect(streams.stderr()).toContain('│  [ERROR]  TEST_FINDING: finding message\n');
  });
  it('labels warnings reports on stdout', () => {
    const streams = captureStreams();
    renderInstallText(installReport({ command: 'remove', mode: 'dry_run', status: 'warnings', exitCode: 1 }), PLAIN_STYLE);
    expect(streams.stdout()).toBe('[WARN] ContextBrake remove (dry_run)\n');
  });
});

describe('CLI install text wrapping', () => {
  it('wraps a long note at word boundaries and keeps it under its row', () => {
    const impact = 'word '.repeat(30).trim();
    const harnesses = [{ harness: 'claude-code' as const, outcome: 'planned' as const, supportLevel: 'full' as const, limitations: [{ capability: 'context_usage' as const, impact }] }];
    const lines = formatInstallReport(installReport({}, { harnesses }), PLAIN_STYLE).split('\n').filter((line) => line.startsWith('│'));
    const notes = lines.slice(1).map((line) => line.slice(16));
    expect(notes.length).toBeGreaterThan(1);
    expect(notes.every((note) => note.length <= 76 && !note.startsWith(' '))).toBe(true);
    expect(notes.join(' ')).toBe(`context_usage: ${impact}`);
  });
});

describe('CLI install text with color', () => {
  it('keeps every status word and note when color is on', () => {
    const report = installReport({ status: 'warnings', exitCode: 1, findings: [{ ...finding('warning'), impact: 'some impact', remediation: 'some fix' }] }, { changes: [CONFIG_CREATE] });
    const colored = formatInstallReport(report, createStyle({ color: true, unicode: true }));
    const plain = formatInstallReport(report, PLAIN_STYLE);
    expect(colored).toContain(ESCAPE);
    expect(colored.replaceAll(new RegExp(`${ESCAPE}\\[[0-9;]*m`, 'g'), '')).toBe(plain);
    expect(plain).toContain('│  [WARN]  TEST_FINDING: finding message\n│          Impact: some impact\n│          Remediation: some fix\n');
  });
});
