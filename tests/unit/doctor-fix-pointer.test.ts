import { describe, expect, it } from 'vitest';
import { formatDoctorReport } from '../../src/cli/output/doctor-text.js';
import { PLAIN_STYLE } from '../../src/cli/output/style.js';
import type { DiagnosticFinding, DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { doctorFinding as finding, doctorReport as report } from '../helpers/doctor-fixtures.js';

const NOW = new Date('2026-10-21T12:00:00.000Z');

function format(value: DoctorReport): string {
  return formatDoctorReport(value, { verbose: false, now: NOW, style: PLAIN_STYLE });
}

describe('doctor fix pointer (prd-24 FR-02, TC-03)', () => {
  const automatic: DiagnosticFinding = { ...finding('ASSET_OUTDATED', 'warning'), remediation: 'Run context-brake init --yes.', fix: { group: 'automatic' } };
  const manual: DiagnosticFinding = { ...finding('STATUSLINE_POWERSHELL_FALLBACK', 'warning'), remediation: 'Set CLAUDE_CODE_GIT_BASH_PATH.', fix: { group: 'manual' } };
  const text = format(report({ status: 'warnings', exitCode: 1, findings: [automatic, manual] }));

  it('adds the fixable count to the header', () => {
    expect(text.split('\n')[0]).toBe('ContextBrake doctor: WARN (0 errors, 2 warnings, 1 fixable)');
  });
  it('points the automatic problem to context-brake fix and keeps the manual remediation', () => {
    expect(text.match(/Fix: run context-brake fix/g)).toHaveLength(1);
    expect(text).not.toContain('Fix: Run context-brake init --yes.');
    expect(text).toContain('Fix: Set CLAUDE_CODE_GIT_BASH_PATH.');
  });
  it('omits the fixable count when no problem is fixable', () => {
    expect(format(report({ status: 'warnings', exitCode: 1, findings: [manual] })).split('\n')[0]).toBe('ContextBrake doctor: WARN (0 errors, 1 warning)');
  });
});
