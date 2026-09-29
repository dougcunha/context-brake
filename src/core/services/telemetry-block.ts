import type { UsageReading, Zone } from '../contracts/zones.js';

export const TELEMETRY_BLOCK_VERSION = 3;
export const TELEMETRY_BLOCK_PREFIX = `[ContextBrake v${TELEMETRY_BLOCK_VERSION}]`;
const DEBUG_INSTRUCTION = '(end your reply with this line)';

export type TelemetryBlockInput = {
  readonly turn: number;
  readonly turnCeiling: number | null;
  readonly usagePercentage: number;
  readonly usage: UsageReading;
  readonly zone: Zone;
  readonly action: string;
  readonly debug: boolean;
};

export function renderTelemetryBlock(input: TelemetryBlockInput): string {
  const block = `${TELEMETRY_BLOCK_PREFIX} turn=${renderTurn(input.turn, input.turnCeiling)} usage=${input.usagePercentage}% tokens=${tokens(input.usage)} source=${input.usage.source} window=${input.usage.windowOrigin} zone=${input.zone} action=${input.action}`;
  return input.debug ? `${block}${renderDebugLine(input)}` : block;
}
export function renderTurn(turn: number, turnCeiling: number | null): string {
  return turnCeiling === null ? String(turn) : `${turn}/${turnCeiling}`;
}
function renderDebugLine(input: TelemetryBlockInput): string {
  const line = `📊 ContextBrake: ${input.usagePercentage}% · ${tokens(input.usage)} (${input.usage.windowOrigin}) · ${input.usage.source} · ${input.zone}`;
  return ` debug_line="${line}" ${DEBUG_INSTRUCTION}`;
}
function tokens(usage: UsageReading): string {
  return `${usage.usedTokens ?? 0}/${usage.windowTokens}`;
}
