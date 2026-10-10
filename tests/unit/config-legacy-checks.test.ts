import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { checkLegacyTurnLimits, normalizeTurnLimits } from '../../src/core/services/config-legacy-checks.js';
import { checkConfig } from '../../src/core/services/doctor-checks.js';

type Turns = { green: number; yellow: number; critical: number };

const RETIRED_MESSAGE = 'Turn limits in context-brake.config.json are the retired defaults (7, 10, 12); zones now follow context usage only.';
const IGNORED_MESSAGE = 'criticalTurn and turnCeiling in context-brake.config.json are ignored; only context usage reaches CRITICAL.';

function withTurns(turns: Turns): ContextBrakeConfig {
  const telemetry = DEFAULT_CONFIG.telemetry;
  return { ...DEFAULT_CONFIG, telemetry: { ...telemetry, turnCeiling: turns.critical, zones: { ...telemetry.zones, greenMaxTurn: turns.green, yellowMaxTurn: turns.yellow, criticalTurn: turns.critical } } };
}

describe('LEGACY_TURN_LIMITS in doctor (TC-19, FR-09, DEC-03)', () => {
  it.each([
    { turns: { green: 7, yellow: 10, critical: 12 }, message: RETIRED_MESSAGE },
    { turns: { green: 20, yellow: 30, critical: 40 }, message: IGNORED_MESSAGE },
    { turns: { green: 7, yellow: 10, critical: 15 }, message: IGNORED_MESSAGE },
  ])('reports one warning for turn limits $turns', ({ turns, message }) => {
    expect(checkLegacyTurnLimits(withTurns(turns))).toEqual([{
      code: 'LEGACY_TURN_LIMITS', severity: 'warning', scope: 'project', harness: null, path: 'context-brake.config.json',
      message, impact: null, remediation: 'Run context-brake init --yes.',
    }]);
  });
  it('reports nothing for a normalized config', () => {
    expect(checkConfig({ ...DEFAULT_CONFIG }).findings).toEqual([]);
    const custom = withTurns({ green: 20, yellow: 30, critical: 40 });
    expect(checkLegacyTurnLimits({ ...custom, telemetry: normalizeTurnLimits(custom.telemetry) })).toEqual([]);
  });
});

describe('turn limit normalization on init (FR-09, DEC-03)', () => {
  it.each([
    { turns: { green: 7, yellow: 10, critical: 12 }, zones: DEFAULT_CONFIG.telemetry.zones },
    { turns: { green: 20, yellow: 30, critical: 40 }, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 20, yellowMaxTurn: 30 } },
  ])('drops the retired turn fields and keeps only custom green and yellow turns for $turns', ({ turns, zones }) => {
    expect(normalizeTurnLimits(withTurns(turns).telemetry)).toEqual({ ...DEFAULT_CONFIG.telemetry, zones });
  });
});
