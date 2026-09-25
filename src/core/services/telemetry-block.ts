import type { UsageReading, Zone } from '../contracts/zones.js';

export const TELEMETRY_BLOCK_VERSION = 2;
export const TELEMETRY_BLOCK_PREFIX = `[ContextBrake v${TELEMETRY_BLOCK_VERSION}]`;

export type TelemetryBlockInput = {
  readonly turn: number;
  readonly turnCeiling: number | null;
  readonly usagePercentage: number;
  readonly usage: UsageReading;
  readonly zone: Zone;
  readonly action: string;
};

export function renderTelemetryBlock(input: TelemetryBlockInput): string {
  const { usage } = input;
  const tokens = `${usage.usedTokens ?? 0}/${usage.windowTokens}`;
  return `${TELEMETRY_BLOCK_PREFIX} turn=${renderTurn(input.turn, input.turnCeiling)} usage=${input.usagePercentage}% tokens=${tokens} source=${usage.source} zone=${input.zone} action=${input.action}`;
}
export function renderTurn(turn: number, turnCeiling: number | null): string {
  return turnCeiling === null ? String(turn) : `${turn}/${turnCeiling}`;
}
