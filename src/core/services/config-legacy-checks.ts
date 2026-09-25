import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';

type Telemetry = ContextBrakeConfig['telemetry'];

const RETIRED_TURNS = { greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 } as const;
const RETIRED_MESSAGE = 'Turn limits in context-brake.config.json are the retired defaults (7, 10, 12); zones now follow context usage only.';
const IGNORED_MESSAGE = 'criticalTurn and turnCeiling in context-brake.config.json are ignored; only context usage reaches CRITICAL.';

function hasRetiredTurns(telemetry: Telemetry): boolean {
  const zones = telemetry.zones;
  return zones.greenMaxTurn === RETIRED_TURNS.greenMaxTurn && zones.yellowMaxTurn === RETIRED_TURNS.yellowMaxTurn;
}

function isRetiredDefaults(telemetry: Telemetry): boolean {
  const critical = RETIRED_TURNS.criticalTurn;
  return hasRetiredTurns(telemetry) && (telemetry.zones.criticalTurn ?? critical) === critical && (telemetry.turnCeiling ?? critical) === critical;
}

export function checkLegacyTurnLimits(config: ContextBrakeConfig): DiagnosticFinding[] {
  const telemetry = config.telemetry;
  if (telemetry.turnCeiling === undefined && telemetry.zones.criticalTurn === undefined) return [];
  return [{
    code: 'LEGACY_TURN_LIMITS', severity: 'warning', scope: 'project', harness: null, path: 'context-brake.config.json',
    message: isRetiredDefaults(telemetry) ? RETIRED_MESSAGE : IGNORED_MESSAGE, impact: null, remediation: 'Run context-brake init --yes.',
  }];
}

export function normalizeTurnLimits(telemetry: Telemetry): Telemetry {
  const { greenMaxPercentage, yellowMaxPercentage, criticalPercentage, greenMaxTurn, yellowMaxTurn } = telemetry.zones;
  const percentages = { greenMaxPercentage, yellowMaxPercentage, criticalPercentage };
  const keepPair = greenMaxTurn !== undefined && !hasRetiredTurns(telemetry);
  const { injectionMode, activationThresholdPercentage, contextWindowCeiling } = telemetry;
  return { injectionMode, activationThresholdPercentage, contextWindowCeiling, zones: keepPair ? { ...percentages, greenMaxTurn, yellowMaxTurn } : percentages };
}
