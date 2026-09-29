import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { HarnessDiagnostic } from '../../src/core/contracts/diagnostics.js';
import type { CapabilityState, HarnessId } from '../../src/core/contracts/harness.js';
import { brakeWindowReport, bridgeAbsentFindings } from '../../src/core/services/brake-window-report.js';
import { renderModeLines } from '../../src/cli/output/doctor-mode-text.js';

const DECLARED: ContextBrakeConfig = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, declaredContextWindow: 200000 } };

function integration(harness: HarnessId, contextUsage: CapabilityState): HarnessDiagnostic {
  return { harness, state: 'installed', version: null, overhead: null, support: { harness, supportLevel: 'full', minimumVersion: null, capabilities: [{ id: 'context_usage', state: contextUsage }], limitations: [] } };
}
const PI = integration('pi', 'supported');
const CLAUDE = integration('claude-code', 'unknown');
const CODEX = integration('codex-cli', 'unsupported');

describe('brake window per harness (prd-09 FR-07, DEC-10, TC-10)', () => {
  it('reports who can block and why', () => {
    expect(brakeWindowReport({ config: DECLARED, integrations: [PI, CLAUDE, CODEX], bridge: 'installed' })).toEqual([
      { harness: 'pi', canDeny: true, reason: 'harness' },
      { harness: 'claude-code', canDeny: true, reason: 'bridge' },
      { harness: 'codex-cli', canDeny: true, reason: 'declared' },
    ]);
  });
  it('only warns without the bridge or a declared window', () => {
    expect(brakeWindowReport({ config: DEFAULT_CONFIG, integrations: [CLAUDE, CODEX], bridge: 'absent' })).toEqual([
      { harness: 'claude-code', canDeny: false, reason: 'bridge_absent' },
      { harness: 'codex-cli', canDeny: false, reason: 'no_source' },
    ]);
  });
  it('warns with a remediation only when the Claude Code bridge is absent', () => {
    const absent = brakeWindowReport({ config: DEFAULT_CONFIG, integrations: [CLAUDE], bridge: 'absent' });
    expect(bridgeAbsentFindings(absent, 'absent')).toEqual([expect.objectContaining({ code: 'STATUSLINE_BRIDGE_ABSENT', severity: 'warning', remediation: expect.stringContaining('context-brake init') })]);
    expect(bridgeAbsentFindings(absent, 'inactive')).toEqual([]);
    expect(bridgeAbsentFindings(brakeWindowReport({ config: DEFAULT_CONFIG, integrations: [CODEX], bridge: 'absent' }), 'absent')).toEqual([]);
  });
  it('prints one brake line in the doctor text', () => {
    const brakeWindow = brakeWindowReport({ config: DEFAULT_CONFIG, integrations: [CLAUDE, PI], bridge: 'absent' });
    expect(renderModeLines({ brakeWindow })).toBe('  - brake: claude-code only warns (no status line bridge), pi can block (harness window)\n');
  });
});
