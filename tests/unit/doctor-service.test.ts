import { describe, expect, it } from 'vitest';
import type { HarnessAdapter } from '../../src/core/contracts/adapter.js';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { DiagnosticFinding, DoctorReport, OverheadMeasurer } from '../../src/core/contracts/diagnostics.js';
import type { DetectionSources } from '../../src/core/contracts/harness.js';
import type { RuntimeStateReading } from '../../src/core/services/runtime-error-checks.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';
import { fakeDoctorAdapter } from '../helpers/fake-doctor-adapter.js';
import { fakeOverheadMeasurer, FAKE_P95_MILLISECONDS } from '../helpers/fake-overhead-measurer.js';

const MISSING_FINDING: DiagnosticFinding = { code: 'INTEGRATION_MISSING', severity: 'error', scope: 'harness', harness: 'claude-code', path: '.claude/settings.json', message: 'The claude-code integration is missing from .claude/settings.json.', impact: 'ContextBrake cannot stop or annotate tool calls in this harness.', remediation: 'Run context-brake init --harness claude-code --yes.' };
const PROJECT_EVIDENCE = [{ origin: 'project' as const, kind: 'config', value: '.claude/settings.json' }];
const FAILING_MEASURER: OverheadMeasurer = { measure: () => Promise.reject(new Error('sampling failed')) };
type DiagnoseOptions = { sources?: Partial<DetectionSources>; runtimeState?: RuntimeStateReading; measurer?: OverheadMeasurer; config?: ContextBrakeConfig | null };
function diagnose(adapters: readonly HarnessAdapter[], options: DiagnoseOptions = {}): Promise<DoctorReport> {
  return diagnoseProject({
    projectRoot: '/test-repo', config: options.config === undefined ? { ...DEFAULT_CONFIG, activeHarnesses: adapters.map((a) => a.id) } : options.config,
    adapters, context: { projectRoot: '/test-repo' }, sources: options.sources ?? { 'claude-code': { project: PROJECT_EVIDENCE } }, manifest: null, allSnapshots: [], packageVersion: '1.0.0',
    ...(options.runtimeState ? { runtimeState: options.runtimeState } : {}), ...(options.measurer ? { measurer: options.measurer } : {}),
  });
}
function floorFindings(report: DoctorReport): DiagnosticFinding[] {
  return report.findings.filter((finding) => finding.code === 'VERSION_FLOOR_UNVERIFIED');
}

describe('UT-13: Missing or broken integration is an error finding (CA-14)', () => {
  it.each([
    ['INTEGRATION_MISSING', 'missing'],
    ['INVALID_HARNESS_CONFIG', 'broken'],
    ['ASSET_MISSING', 'broken'],
  ] as const)('reports %s as a %s integration with exit code 2, unmeasured, keeping the floor warning (T12/CR-02)', async (code, state) => {
    const report = await diagnose([fakeDoctorAdapter('claude-code', null, [{ ...MISSING_FINDING, code }])], { measurer: fakeOverheadMeasurer });
    expect(report.integrations[0]).toMatchObject({ state, overhead: null });
    expect(report.status).toBe('errors');
    expect(report.exitCode).toBe(2);
    expect(floorFindings(report)).toHaveLength(1);
  });
});

describe('T12/CR-02: Unknown version floor is a stable doctor warning', () => {
  it('emits exactly one VERSION_FLOOR_UNVERIFIED warning and reports warnings with exit code 1', async () => {
    const report = await diagnose([fakeDoctorAdapter('claude-code', null)]);
    const floors = floorFindings(report);
    expect(floors).toHaveLength(1);
    expect(floors[0]).toMatchObject({ severity: 'warning', scope: 'harness', harness: 'claude-code', path: null });
    expect(floors[0]?.message).toMatch(/minimum verified version/i);
    expect(report.status).toBe('warnings');
    expect(report.exitCode).toBe(1);
    expect(report.integrations[0]?.support.supportLevel).toBe('full');
  });
  it('reports a healthy measured integration without the warning when the profile has a verified floor', async () => {
    const report = await diagnose([fakeDoctorAdapter('claude-code', '1.2.0')], { measurer: fakeOverheadMeasurer });
    expect(floorFindings(report)).toHaveLength(0);
    expect(report.status).toBe('healthy');
    expect(report.exitCode).toBe(0);
    expect(report.integrations[0]).toMatchObject({ state: 'installed', overhead: { p95Milliseconds: FAKE_P95_MILLISECONDS } });
  });
});

describe('doctor overhead and configuration fallbacks', () => {
  it('reports a null overhead and stays healthy when the measurement fails', async () => {
    const report = await diagnose([fakeDoctorAdapter('claude-code')], { measurer: FAILING_MEASURER });
    expect(report.integrations[0]).toMatchObject({ state: 'installed', overhead: null });
    expect(report.status).toBe('healthy');
  });
  it('diagnoses the project-detected harnesses with a missing-configuration warning and no snapshot section', async () => {
    const report = await diagnose([fakeDoctorAdapter('claude-code')], { config: null });
    expect(report.integrations.map((integration) => integration.harness)).toEqual(['claude-code']);
    expect(report.findings.map((finding) => finding.code)).toEqual(['CONFIG_MISSING']);
    expect('snapshot' in report).toBe(false);
  });
});

describe('T05: runtime brake state reaches doctor findings (CA-17, CA-18)', () => {
  it('adds only the runtime error finding from the runtime reading, with no brake finding (prd-12 FR-09)', async () => {
    const runtimeState: RuntimeStateReading = { errors: [{ v: 1, at: '2026-09-15T12:00:00.000Z', harness: 'codex-cli', event: 'PostToolUse', code: 'UNEXPECTED', detail: 'RuntimeFailure' }] };
    const report = await diagnose([fakeDoctorAdapter('codex-cli')], { sources: { 'codex-cli': { project: PROJECT_EVIDENCE } }, runtimeState });
    expect(report.findings.map((finding) => finding.code)).toEqual(['RUNTIME_ERRORS_RECORDED']);
  });
});
