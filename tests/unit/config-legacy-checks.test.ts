import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { checkLegacyTurnLimits, normalizeTurnLimits } from '../../src/core/services/config-legacy-checks.js';
import { checkConfig } from '../../src/core/services/doctor-checks.js';
import { planConfigChange } from '../../src/core/services/installation-builder.js';

type Turns = { green: number; yellow: number; critical: number };

function withTurns(turns: Turns): ContextBrakeConfig {
  const telemetry = DEFAULT_CONFIG.telemetry;
  return { ...DEFAULT_CONFIG, telemetry: { ...telemetry, turnCeiling: turns.critical, zones: { ...telemetry.zones, greenMaxTurn: turns.green, yellowMaxTurn: turns.yellow, criticalTurn: turns.critical } } };
}

describe('LEGACY_TURN_LIMITS in doctor (TC-19, FR-09, DEC-03)', () => {
  it('reports the retired defaults for 7/10/12', () => {
    const findings = checkConfig(withTurns({ green: 7, yellow: 10, critical: 12 })).findings;
    expect(findings).toEqual([expect.objectContaining({ code: 'LEGACY_TURN_LIMITS', severity: 'warning', remediation: 'Run context-brake init --yes.' })]);
    expect(findings[0]?.message).toContain('retired defaults (7, 10, 12)');
  });
  it('reports ignored fields for custom limits 20/30/40', () => {
    const [finding] = checkLegacyTurnLimits(withTurns({ green: 20, yellow: 30, critical: 40 }));
    expect(finding?.message).toContain('criticalTurn and turnCeiling in context-brake.config.json are ignored');
  });
  it('reports ignored fields when only the critical turn differs from the retired default', () => {
    expect(checkLegacyTurnLimits(withTurns({ green: 7, yellow: 10, critical: 15 }))[0]?.message).toContain('are ignored');
  });
  it('reports nothing for a normalized config', () => {
    expect(checkConfig(DEFAULT_CONFIG).findings).toEqual([]);
    const custom = withTurns({ green: 20, yellow: 30, critical: 40 });
    expect(checkLegacyTurnLimits({ ...custom, telemetry: normalizeTurnLimits(custom.telemetry) })).toEqual([]);
  });
});

describe('turn limit normalization on init (FR-09, DEC-03)', () => {
  it('drops the four retired turn fields and keeps the other telemetry keys', () => {
    expect(normalizeTurnLimits(withTurns({ green: 7, yellow: 10, critical: 12 }).telemetry)).toEqual(DEFAULT_CONFIG.telemetry);
  });
  it('keeps custom greenMaxTurn and yellowMaxTurn as optional limits', () => {
    const zones = normalizeTurnLimits(withTurns({ green: 20, yellow: 30, critical: 40 }).telemetry).zones;
    expect(zones).toEqual({ ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 20, yellowMaxTurn: 30 });
  });
  it('plans a normalized config update that is stable on a second pass', () => {
    const first = planConfigChange({ root: '/repo', current: withTurns({ green: 7, yellow: 10, critical: 12 }), active: ['claude-code'] });
    expect(first.change.kind).toBe('update');
    expect(first.change.content).not.toMatch(/Turn|turnCeiling/);
    const second = planConfigChange({ root: '/repo', current: first.config, active: ['claude-code'] });
    expect(second.change.content).toBe(first.change.content);
  });
});
