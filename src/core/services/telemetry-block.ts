import type { UsageReading, Zone } from '../contracts/zones.js';
import { ZONE_ACTIONS } from './zone-actions.js';

export const TELEMETRY_BLOCK_VERSION = 1;

export type TelemetryBlockInput = {
  readonly turn: number;
  readonly turnCeiling: number;
  readonly usagePercentage: number;
  readonly usage: UsageReading;
  readonly zone: Zone;
};

export function renderTelemetryBlock(input: TelemetryBlockInput): string {
  const { usage } = input;
  const tokens = `${usage.usedTokens ?? 0}/${usage.windowTokens}`;
  return `[ContextBrake v1] turn=${input.turn}/${input.turnCeiling} usage=${input.usagePercentage}% tokens=${tokens} source=${usage.source} zone=${input.zone} action=${ZONE_ACTIONS[input.zone].compact}`;
}
