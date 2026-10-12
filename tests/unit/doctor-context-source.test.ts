import { describe, expect, it } from 'vitest';
import type { ContextWindowReport } from '../../src/core/contracts/context-window-report.js';
import { doctorReportExtras } from '../../src/core/services/doctor-report-extras.js';

function codes(contextWindow: ContextWindowReport): string[] {
  return doctorReportExtras({ config: null, planPresent: false, contextWindow, sessions: [] }, []).findings.map((finding) => finding.code);
}

const BASE = { bridge: 'absent', mod: 'absent', source: 'contextWindowCeiling', lastWindowTokens: null } as const;

describe('doctor findings about the context source (FR-07, TC-09)', () => {
  it('reports the mod as ready when a session reported the context', () => {
    expect(codes({ ...BASE, mod: 'reporting', source: 'mod', lastWindowTokens: 1_000_000 })).toEqual(['CONTEXT_MOD_READY']);
  });

  it('warns that an installed mod is silent and does not blame the missing bridge', () => {
    expect(codes({ ...BASE, mod: 'installed' })).toEqual(['CONTEXT_MOD_SILENT']);
  });

  it('keeps the bridge-absent warning when neither source is installed', () => {
    expect(codes(BASE)).toEqual(['STATUSLINE_BRIDGE_ABSENT']);
  });

  it('says nothing about a silent mod while the bridge is installed', () => {
    expect(codes({ ...BASE, bridge: 'installed', mod: 'installed', source: 'statusline', lastWindowTokens: 1_000_000 })).toEqual([]);
  });
});
