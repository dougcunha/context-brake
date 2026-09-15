import { describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import type { HarnessAdapter } from '../../src/core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../src/core/contracts/diagnostics.js';
import type { DetectionSources } from '../../src/core/contracts/harness.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';
import { renderIgnoreBlock } from '../../src/core/services/gitignore-markers.js';
import { renderProtocol } from '../../src/core/services/protocol-service.js';

const missingFinding: DiagnosticFinding = { code: 'INTEGRATION_MISSING', severity: 'error', scope: 'harness', harness: 'claude-code', path: '.claude/settings.json', message: 'The claude-code integration is missing from .claude/settings.json.', impact: 'ContextBrake cannot stop or annotate tool calls in this harness.', remediation: 'Run context-brake init --harness claude-code --yes.' };

function makeAdapter(id: HarnessAdapter['id'], minimumVersion: string | null, findings: readonly DiagnosticFinding[] = []): HarnessAdapter {
  const executionModel = 'process' as const;
  return {
    id, executionModel,
    capabilityProfile: () => ({ harness: id, supportLevel: 'full', minimumVersion, capabilities: [], limitations: [] }),
    detect: async () => [],
    probeVersion: async () => ({ status: 'resolved', display: '1.0.0', normalized: '1.0.0', source: 'executable', minimumVersion }),
    planInstall: async () => ({ harness: id, changes: [], conflicts: [], entries: [] }),
    planRemove: async () => ({ harness: id, changes: [], conflicts: [], entries: [] }),
    diagnose: async () => findings,
    benchmarkFixture: () => ({ harness: id, executionModel, event: 'PreToolUse', targetMilliseconds: 100, samplePayload: {} }),
  };
}

const protocolSnapshot: FileSnapshot = { path: 'docs/context-brake-protocol.md', realPath: '/test-repo/docs/context-brake-protocol.md', exists: true, content: renderProtocol(DEFAULT_CONFIG), sha256: 'proto', isSymlink: false, fileIdentity: 'proto' };
const gitignoreSnapshot: FileSnapshot = { path: '.gitignore', realPath: '/test-repo/.gitignore', exists: true, content: `${renderIgnoreBlock('task_plan.json', 'state_checkpoint.json')}\n`, sha256: 'gitignore', isSymlink: false, fileIdentity: 'gitignore' };
const projectEvidence = [{ origin: 'project' as const, kind: 'config', value: '.claude/settings.json' }];

function diagnose(adapters: readonly HarnessAdapter[], sources: Partial<DetectionSources> = { 'claude-code': { project: projectEvidence } }) {
  return diagnoseProject({
    projectRoot: '/test-repo', config: { ...DEFAULT_CONFIG, activeHarnesses: adapters.map((a) => a.id) },
    adapters, context: { projectRoot: '/test-repo' }, sources, instructionSnapshots: [], protocolSnapshot, gitignoreSnapshot,
  });
}

function floorFindings(report: Awaited<ReturnType<typeof diagnose>>) {
  return report.findings.filter((finding) => finding.code === 'VERSION_FLOOR_UNVERIFIED');
}

describe('UT-13: Missing integration is an error finding (CA-14)', () => {
  it('produces INTEGRATION_MISSING and report exit code 2 when active integration is absent', async () => {
    const report = await diagnose([makeAdapter('claude-code', null, [missingFinding])]);

    expect(report.exitCode).toBe(2);
    expect(report.status).toBe('errors');
    expect(report.findings.some((f) => f.code === 'INTEGRATION_MISSING' && f.severity === 'error')).toBe(true);
    expect(report.integrations[0]?.state).toBe('missing');
  });
});

describe('T12/CR-02: Unknown version floor is a stable doctor warning', () => {
  it('emits exactly one VERSION_FLOOR_UNVERIFIED warning and reports warnings with exit code 1', async () => {
    const report = await diagnose([makeAdapter('claude-code', null)]);
    const floors = floorFindings(report);

    expect(floors).toHaveLength(1);
    expect(floors[0]).toMatchObject({ severity: 'warning', scope: 'harness', harness: 'claude-code', path: null });
    expect(floors[0]?.message).toMatch(/minimum verified version/i);
    expect(floors[0]?.impact).toBeTruthy();
    expect(floors[0]?.remediation).toBeTruthy();
    expect(report.status).toBe('warnings');
    expect(report.exitCode).toBe(1);
    expect(report.integrations[0]?.support.supportLevel).toBe('full');
  });

  it('does not emit the warning when the profile has a verified floor', async () => {
    const report = await diagnose([makeAdapter('claude-code', '1.2.0')]);

    expect(floorFindings(report)).toHaveLength(0);
    expect(report.status).toBe('healthy');
    expect(report.exitCode).toBe(0);
  });
});

describe('T12/CR-02: Unknown floor across multiple integrations and error precedence', () => {
  it('emits at most one warning per integration across multiple diagnosed harnesses', async () => {
    const sources: Partial<DetectionSources> = { 'claude-code': { project: projectEvidence }, cursor: { project: projectEvidence } };
    const report = await diagnose([makeAdapter('claude-code', null), makeAdapter('cursor', null)], sources);

    expect(report.integrations).toHaveLength(2);
    expect(floorFindings(report)).toHaveLength(2);
    expect(report.exitCode).toBe(1);
  });

  it('keeps error precedence when the integration also has an error finding', async () => {
    const report = await diagnose([makeAdapter('claude-code', null, [missingFinding])]);

    expect(floorFindings(report)).toHaveLength(1);
    expect(report.status).toBe('errors');
    expect(report.exitCode).toBe(2);
  });
});
