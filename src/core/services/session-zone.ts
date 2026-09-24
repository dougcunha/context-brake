import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { EstimationConstants } from '../contracts/runtime.js';
import type { UsageReading, Zone } from '../contracts/zones.js';
import type { SessionSummary } from './session-counters.js';
import { renderTelemetryBlock } from './telemetry-block.js';
import { estimatedTokens, resolveUsage } from './usage-resolver.js';
import { classifyZone, usagePercentage } from './zone-classifier.js';

export type MeasuredUsage = { readonly tokens: number | null; readonly contextWindow: number };
export type ZoneSettings = { readonly descriptor: { readonly estimation: EstimationConstants }; readonly config: Pick<ContextBrakeConfig, 'telemetry'> };
export type ZoneInputs = { readonly summary: SessionSummary; readonly turns: number; readonly observedCharacters: number; readonly measured?: MeasuredUsage | undefined };
export type ZoneReading = { readonly reading: UsageReading; readonly estimate: number; readonly percentage: number; readonly zone: Zone };

export function readZone(settings: ZoneSettings, inputs: ZoneInputs): ZoneReading {
  const estimated = { observedCharacters: inputs.summary.observedCharacters + inputs.observedCharacters, turns: inputs.turns };
  const reading = resolveUsage({ estimated, measured: inputs.measured, constants: settings.descriptor.estimation, contextWindowCeiling: settings.config.telemetry.contextWindowCeiling });
  const percentage = usagePercentage(reading.usedTokens ?? 0, reading.windowTokens);
  return { reading, estimate: estimatedTokens(estimated, settings.descriptor.estimation), percentage, zone: classifyZone({ usagePercentage: percentage, turns: inputs.turns }, settings.config.telemetry.zones) };
}

export function renderSessionTelemetry(settings: ZoneSettings, inputs: ZoneInputs): string {
  const { reading, percentage, zone } = readZone(settings, inputs);
  return renderTelemetryBlock({ turn: inputs.turns, turnCeiling: settings.config.telemetry.turnCeiling, usagePercentage: percentage, usage: reading, zone });
}
