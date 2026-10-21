import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDoctorReport, renderDoctorText } from '../../src/cli/output/doctor-text.js';
import { createStyle, PLAIN_STYLE, type Style } from '../../src/cli/output/style.js';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { doctorFinding as finding, doctorReport as report } from '../helpers/doctor-fixtures.js';

const NOW = new Date('2026-10-21T12:00:00.000Z');
const ESCAPE = String.fromCharCode(27);

function format(value: DoctorReport, style: Style = PLAIN_STYLE): string {
  return formatDoctorReport(value, { verbose: false, now: NOW, style });
}

const FULL_REPORT = report({
  status: 'warnings', exitCode: 1, findings: [finding('W1', 'warning'), finding('OK1', 'ok')],
  integrations: [{ harness: 'claude-code', state: 'installed', version: null, support: { harness: 'claude-code', supportLevel: 'full', minimumVersion: null, capabilities: [], limitations: [] }, overhead: null }],
  snapshot: { triggerZone: 'RED', command: null, resumeCommand: null },
  activeSessions: [{ harness: 'claude-code', sessionId: 's-1', lastActivityAt: NOW.toISOString(), usage: null }],
});

afterEach(() => { vi.restoreAllMocks(); });

describe('doctor header (FR-01, TC-01)', () => {
  it('gives the status label with the error and warning counts', () => {
    const text = format(report({ status: 'errors', exitCode: 2, findings: [finding('E1', 'error'), finding('W1', 'warning'), finding('W2', 'warning')] }));
    expect(text.split('\n')[0]).toBe('ContextBrake doctor: ERROR (1 error, 2 warnings)');
  });
  it('says no problems were found for a healthy report', () => {
    expect(format(report({ findings: [finding('OK1', 'ok')] })).split('\n')[0]).toBe('ContextBrake doctor: OK (no problems found)');
  });
  it('keeps the OK header when the overhead is above its target (FR-06, TC-04, codereview_01 CR-02)', () => {
    const slow = report({ integrations: [{ harness: 'claude-code', state: 'installed', version: null, support: { harness: 'claude-code', supportLevel: 'full', minimumVersion: null, capabilities: [], limitations: [] }, overhead: { harness: 'claude-code', executionModel: 'process', sampleCount: 20, p95Milliseconds: 133.7, targetMilliseconds: 100, status: 'fail' } }] });
    const lines = format(slow).split('\n');
    expect(lines[0]).toBe('ContextBrake doctor: OK (no problems found)');
    expect(lines).toContain('│  claude-code  installed, full support, overhead 134 ms / 100 ms WARN');
  });
});

describe('doctor sections (FR-02, TC-02)', () => {
  it('prints the sections in order', () => {
    const titles = format(FULL_REPORT).split('\n').filter((line) => line.startsWith('┌─ ')).map((line) => line.slice(3));
    expect(titles).toEqual(['Problems', 'Harnesses', 'Context', 'Sessions', 'Checks passed']);
  });
  it('omits empty sections but always prints Problems', () => {
    expect(format(report({}))).toBe('ContextBrake doctor: OK (no problems found)\n\n┌─ Problems\n│    No problems found.\n└─\n');
  });
});

describe('doctor verbose hint (FR-11, DEC-10, TC-08)', () => {
  const limited = report({
    findings: [finding('OK1', 'ok')],
    integrations: [{ harness: 'claude-code', state: 'installed', version: null, support: { harness: 'claude-code', supportLevel: 'full', minimumVersion: null, capabilities: [], limitations: [{ capability: 'context_usage', impact: 'estimated' }, { capability: 'auto_restart', impact: 'opt-in' }] }, overhead: null }],
  });
  it('names the hidden limitations and passed-check messages in the default output', () => {
    const text = format(limited);
    expect(text).not.toContain('context_usage: estimated');
    expect(text.endsWith('\n\nRun context-brake doctor --verbose to see 2 capability limitations and the passed-check messages.\n')).toBe(true);
  });
  it('shows the limitations and no hint in verbose mode', () => {
    const text = formatDoctorReport(limited, { verbose: true, now: NOW, style: PLAIN_STYLE });
    expect(text).toContain('context_usage: estimated');
    expect(text).not.toContain('--verbose');
  });
  it('prints no hint when nothing is hidden', () => {
    expect(format(report({ findings: [finding('W1', 'warning')] }))).not.toContain('--verbose');
  });
});

describe('doctor text labels (NFR-02, NFR-04, TC-10)', () => {
  it('keeps the text labels with color and prints no escape code without it', () => {
    const colored = format(FULL_REPORT, createStyle({ color: true, unicode: false }));
    expect(colored).toContain('WARN');
    expect(colored).toContain(ESCAPE);
    expect(format(FULL_REPORT)).not.toContain(ESCAPE);
    expect(format(FULL_REPORT, createStyle({ color: false, unicode: false }))).toContain('+- Problems');
  });
});

describe('doctor text stream (FR-13, TC-13)', () => {
  it('writes an errors report to stdout and nothing to stderr', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    renderDoctorText(report({ status: 'errors', exitCode: 2, findings: [finding('E1', 'error')] }), { verbose: false, now: NOW });
    expect(String(stdout.mock.calls[0]?.[0])).toContain('E1');
    expect(stderr).not.toHaveBeenCalled();
  });
});
