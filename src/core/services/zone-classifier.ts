import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { Zone, ZoneInput } from '../contracts/zones.js';

export type ZoneLimits = ContextBrakeConfig['telemetry']['zones'];

export function usagePercentage(usedTokens: number, windowTokens: number): number {
  if (windowTokens <= 0) return 100;
  return Math.floor((usedTokens * 100) / windowTokens);
}
export function classifyZone(input: ZoneInput, zones: ZoneLimits): Zone {
  if (input.usagePercentage >= zones.criticalPercentage || input.turns >= zones.criticalTurn) return 'CRITICAL';
  if (input.usagePercentage > zones.yellowMaxPercentage || input.turns > zones.yellowMaxTurn) return 'RED';
  if (input.usagePercentage > zones.greenMaxPercentage || input.turns > zones.greenMaxTurn) return 'YELLOW';
  return 'GREEN';
}
