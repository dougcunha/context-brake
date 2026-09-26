import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderDoctorText } from '../../src/cli/output/text.js';
import type { HarnessAdapter } from '../../src/core/contracts/adapter.js';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { ContextWindowReport } from '../../src/core/contracts/context-window-report.js';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';

const WINDOW: ContextWindowReport = { bridge: 'installed', source: 'statusline', lastWindowTokens: 1000000 };
const SNAPSHOT: FileSnapshot = { path: 'x', realPath: '/repo/x', exists: false, content: null, sha256: null, isSymlink: false, fileIdentity: 'x' };

function adapter(id: HarnessAdapter['id']): HarnessAdapter {
  return {
    id, executionModel: 'process',
    capabilityProfile: () => ({ harness: id, supportLevel: 'full', minimumVersion: '1.0.0', capabilities: [], limitations: [] }),
    detect: async () => [], probeVersion: async () => ({ status: 'resolved', display: '1.0.0', normalized: '1.0.0', source: 'executable', minimumVersion: '1.0.0' }),
    planInstall: async () => ({ harness: id, changes: [], conflicts: [], entries: [] }), planRemove: async () => ({ harness: id, changes: [], conflicts: [], entries: [] }),
    diagnose: async () => [], benchmarkFixture: () => ({ harness: id, executionModel: 'process', event: 'PreToolUse', targetMilliseconds: 100, samplePayload: {} }),
  };
}
function diagnose(id: HarnessAdapter['id']): Promise<DoctorReport> {
  return diagnoseProject({
    projectRoot: '/repo', config: { ...DEFAULT_CONFIG, activeHarnesses: [id] }, adapters: [adapter(id)], context: { projectRoot: '/repo' }, sources: {},
    instructionSnapshots: [], protocolSnapshot: SNAPSHOT, gitignoreSnapshot: SNAPSHOT, manifest: null, allSnapshots: [], packageVersion: '1.0.0', contextWindow: WINDOW,
  });
}

afterEach(() => { vi.restoreAllMocks(); });

describe('doctor context window section (FR-07, DEC-10, TC-17)', () => {
  it('includes the section when claude-code is targeted', async () => {
    expect((await diagnose('claude-code')).contextWindow).toEqual(WINDOW);
  });

  it('omits the section when claude-code is not targeted', async () => {
    expect('contextWindow' in (await diagnose('cursor'))).toBe(false);
  });

  it('renders one text line with source, bridge state, and last window', async () => {
    const report = await diagnose('claude-code');
    const output: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { output.push(String(chunk)); return true; });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => { output.push(String(chunk)); return true; });
    renderDoctorText(report);
    expect(output.join('').split('\n').filter((line) => line.includes('context window'))).toEqual(['  - context window: statusline (bridge: installed, last window: 1000000)']);
  });

  it('renders an unknown last window', () => {
    const output: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { output.push(String(chunk)); return true; });
    renderDoctorText({ schemaVersion: 1, command: 'doctor', status: 'healthy', exitCode: 0, detections: [], integrations: [], findings: [], contextWindow: { bridge: 'absent', source: 'contextWindowCeiling', lastWindowTokens: null } });
    expect(output.join('')).toContain('  - context window: contextWindowCeiling (bridge: absent, last window: unknown)');
  });
});
