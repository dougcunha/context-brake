import type { HarnessAdapter } from '../../src/core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../src/core/contracts/diagnostics.js';

const VERIFIED_VERSION = '1.0.0';

export function fakeDoctorAdapter(id: HarnessAdapter['id'], minimumVersion: string | null = VERIFIED_VERSION, findings: readonly DiagnosticFinding[] = []): HarnessAdapter {
  const executionModel = 'process' as const;
  return {
    id, executionModel,
    capabilityProfile: () => ({ harness: id, supportLevel: 'full', minimumVersion, capabilities: [], limitations: [] }),
    detect: async () => [],
    probeVersion: async () => ({ status: 'resolved', display: VERIFIED_VERSION, normalized: VERIFIED_VERSION, source: 'executable', minimumVersion }),
    planInstall: async () => ({ harness: id, changes: [], conflicts: [], entries: [] }),
    planRemove: async () => ({ harness: id, changes: [], conflicts: [], entries: [] }),
    diagnose: async () => findings,
    benchmarkFixture: () => ({ harness: id, executionModel, event: 'PreToolUse', targetMilliseconds: 100, samplePayload: {} }),
  };
}
