import { describe, expect, it } from 'vitest';
import type { HarnessAdapter } from '../../src/core/contracts/adapter.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { ContextWindowReport } from '../../src/core/contracts/context-window-report.js';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';

const WINDOW: ContextWindowReport = { bridge: 'installed', source: 'statusline', lastWindowTokens: 1000000 };
const ABSENT: ContextWindowReport = { bridge: 'absent', source: 'contextWindowCeiling', lastWindowTokens: null };

function adapter(id: HarnessAdapter['id']): HarnessAdapter {
  return {
    id, executionModel: 'process',
    capabilityProfile: () => ({ harness: id, supportLevel: 'full', minimumVersion: '1.0.0', capabilities: [], limitations: [] }),
    detect: async () => [], probeVersion: async () => ({ status: 'resolved', display: '1.0.0', normalized: '1.0.0', source: 'executable', minimumVersion: '1.0.0' }),
    planInstall: async () => ({ harness: id, changes: [], conflicts: [], entries: [] }), planRemove: async () => ({ harness: id, changes: [], conflicts: [], entries: [] }),
    diagnose: async () => [], benchmarkFixture: () => ({ harness: id, executionModel: 'process', event: 'PreToolUse', targetMilliseconds: 100, samplePayload: {} }),
  };
}
function diagnose(id: HarnessAdapter['id'], contextWindow: ContextWindowReport = WINDOW): Promise<DoctorReport> {
  return diagnoseProject({
    projectRoot: '/repo', config: { ...DEFAULT_CONFIG, activeHarnesses: [id] }, adapters: [adapter(id)], context: { projectRoot: '/repo' }, sources: {},
    manifest: null, allSnapshots: [], packageVersion: '1.0.0', contextWindow,
  });
}

describe('doctor context window section (FR-07, DEC-10, TC-17)', () => {
  it('includes the section when claude-code is targeted', async () => {
    expect((await diagnose('claude-code')).contextWindow).toEqual(WINDOW);
  });

  it('omits the section when claude-code is not targeted', async () => {
    expect('contextWindow' in (await diagnose('cursor'))).toBe(false);
  });
});

describe('status line bridge finding (prd-12 FR-09, DEC-10, TC-14)', () => {
  it('warns with Claude Code active and the bridge absent, without a brake window or blocking text', async () => {
    const report = await diagnose('claude-code', ABSENT);
    const finding = report.findings.find((entry) => entry.code === 'STATUSLINE_BRIDGE_ABSENT');
    expect(finding).toMatchObject({ severity: 'warning', harness: 'claude-code' });
    expect(`${finding?.message ?? ''} ${finding?.impact ?? ''}`).not.toMatch(/block/i);
    expect('brakeWindow' in report).toBe(false);
  });
  it('stays silent with the bridge installed or Claude Code inactive', async () => {
    expect((await diagnose('claude-code')).findings.some((entry) => entry.code === 'STATUSLINE_BRIDGE_ABSENT')).toBe(false);
    expect((await diagnose('cursor', ABSENT)).findings.some((entry) => entry.code === 'STATUSLINE_BRIDGE_ABSENT')).toBe(false);
  });
});
