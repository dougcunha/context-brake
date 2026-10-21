import { describe, expect, it } from 'vitest';
import { checkRows, harnessRows, problemRows } from '../../src/cli/output/doctor-rows.js';
import type { HarnessDiagnostic } from '../../src/core/contracts/diagnostics.js';
import { doctorFinding as finding } from '../helpers/doctor-fixtures.js';

const DEFAULT = { verbose: false } as const;
const VERBOSE = { verbose: true } as const;

function integration(overhead: HarnessDiagnostic['overhead']): HarnessDiagnostic {
  return { harness: 'claude-code', state: 'installed', version: '2.1.300', support: { harness: 'claude-code', supportLevel: 'full', minimumVersion: '2.1.97', capabilities: [], limitations: [{ capability: 'context_usage', impact: 'estimated' }] }, overhead };
}

describe('doctor problem rows (FR-03, FR-04, TC-03)', () => {
  it('lists errors before warnings and keeps report order inside each severity', () => {
    const rows = problemRows([finding('W1', 'warning'), finding('E1', 'error'), finding('OK1', 'ok'), finding('W2', 'warning')]);
    expect(rows.map((row) => [row.label, row.value])).toEqual([['ERROR', 'E1'], ['WARN', 'W1'], ['WARN', 'W2']]);
  });
  it('shows harness, path, message, impact, and the remediation as the fix', () => {
    const [row] = problemRows([finding('ASSET_OUTDATED', 'warning', { harness: 'claude-code', path: '.claude/hooks/hook.mjs', impact: 'Old code runs.', remediation: 'Run context-brake init --yes.' })]);
    expect(row).toEqual({ label: 'WARN', value: 'ASSET_OUTDATED  claude-code  .claude/hooks/hook.mjs', tone: 'warn', notes: ['ASSET_OUTDATED message', 'Impact: Old code runs.', 'Fix: Run context-brake init --yes.'] });
  });
  it('prints one no-problems row when only passed checks exist', () => {
    expect(problemRows([finding('OK1', 'ok')])).toEqual([{ label: '', value: 'No problems found.', tone: 'good' }]);
  });
});

describe('doctor harness rows (FR-05, FR-06, TC-04)', () => {
  it('marks an overhead above the target with WARN and rounds the p95', () => {
    const [row] = harnessRows({ integrations: [integration({ harness: 'claude-code', executionModel: 'process', sampleCount: 20, p95Milliseconds: 133.7, targetMilliseconds: 100, status: 'fail' })], detections: [] }, DEFAULT);
    expect(row).toEqual({ label: 'claude-code', value: 'installed, full support, version 2.1.300, overhead 134 ms / 100 ms WARN', tone: 'warn', notes: [] });
  });
  it('omits the overhead without a measurement and lists an excluded harness', () => {
    const rows = harnessRows({ integrations: [integration(null)], detections: [{ harness: 'codex-cli', state: 'excluded', evidence: [], selectedExplicitly: false, version: null, versionSource: null }] }, DEFAULT);
    expect(rows.map((row) => row.value)).toEqual(['installed, full support, version 2.1.300', 'excluded by configuration']);
  });
  it('adds each capability limitation as a note only in verbose mode (FR-11, TC-08)', () => {
    const [row] = harnessRows({ integrations: [integration(null)], detections: [] }, VERBOSE);
    expect(row?.notes).toEqual(['context_usage: estimated']);
  });
});

describe('doctor passed checks (FR-10, TC-07)', () => {
  it('joins the passed codes on one row', () => {
    expect(checkRows([finding('A', 'ok'), finding('W', 'warning'), finding('B', 'ok')], DEFAULT)).toEqual([{ label: 'OK', value: 'A, B', tone: 'good' }]);
  });
  it('prints nothing without passed checks', () => {
    expect(checkRows([finding('W', 'warning')], VERBOSE)).toEqual([]);
  });
  it('prints one row per passed check with its message in verbose mode', () => {
    expect(checkRows([finding('A', 'ok'), finding('B', 'ok')], VERBOSE)).toEqual([
      { label: 'OK', value: 'A', tone: 'good', notes: ['A message'] },
      { label: 'OK', value: 'B', tone: 'good', notes: ['B message'] },
    ]);
  });
});
