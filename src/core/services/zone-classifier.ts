import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { Zone, ZoneInput } from '../contracts/zones.js';

export type ZoneLimits = ContextBrakeConfig['telemetry']['zones'];
export type TurnLimits = { readonly greenMaxTurn: number; readonly yellowMaxTurn: number };

export function usagePercentage(usedTokens: number, windowTokens: number): number {
  if (windowTokens <= 0) return 100;
  return Math.floor((usedTokens * 100) / windowTokens);
}
export function turnLimits(zones: ZoneLimits): TurnLimits | null {
  if (zones.greenMaxTurn === undefined || zones.yellowMaxTurn === undefined) return null;
  return { greenMaxTurn: zones.greenMaxTurn, yellowMaxTurn: zones.yellowMaxTurn };
}
export function redStartTurn(zones: ZoneLimits): number | null {
  const limits = turnLimits(zones);
  return limits === null ? null : limits.yellowMaxTurn + 1;
}
export function classifyZone(input: ZoneInput, zones: ZoneLimits): Zone {
  if (input.usagePercentage >= zones.criticalPercentage) return 'CRITICAL';
  const limits = turnLimits(zones);
  if (input.usagePercentage > zones.yellowMaxPercentage || (limits !== null && input.turns > limits.yellowMaxTurn)) return 'RED';
  if (input.usagePercentage > zones.greenMaxPercentage || (limits !== null && input.turns > limits.greenMaxTurn)) return 'YELLOW';
  return 'GREEN';
}
