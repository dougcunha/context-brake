import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { EstimationConstants } from '../contracts/runtime.js';
import type { UsageReading, Zone } from '../contracts/zones.js';
import type { SessionSummary } from './session-counters.js';
import { renderTelemetryBlock } from './telemetry-block.js';
import { estimatedTokens, resolveUsage } from './usage-resolver.js';
import { classifyZone, redStartTurn, usagePercentage } from './zone-classifier.js';

export type MeasuredUsage = { readonly tokens: number | null; readonly contextWindow: number | null; readonly at?: string | undefined };
export type ZoneSettings = { readonly descriptor: { readonly estimation: EstimationConstants }; readonly config: Pick<ContextBrakeConfig, 'telemetry'> };
export type ZoneInputs = { readonly summary: SessionSummary; readonly turns: number; readonly observedCharacters: number; readonly measured?: MeasuredUsage | undefined };
export type ZoneReading = { readonly reading: UsageReading; readonly estimate: number; readonly percentage: number; readonly zone: Zone };

export function readZone(settings: ZoneSettings, inputs: ZoneInputs): ZoneReading {
  const estimated = { observedCharacters: inputs.summary.observedCharacters + inputs.observedCharacters, turns: inputs.turns };
  const measured = isStale(inputs.measured, inputs.summary.lastResetAt) ? undefined : inputs.measured;
  const reading = resolveUsage({ estimated, measured, constants: settings.descriptor.estimation, contextWindowCeiling: settings.config.telemetry.contextWindowCeiling });
  const percentage = usagePercentage(reading.usedTokens ?? 0, reading.windowTokens);
  return { reading, estimate: estimatedTokens(estimated, settings.descriptor.estimation), percentage, zone: classifyZone({ usagePercentage: percentage, turns: inputs.turns }, settings.config.telemetry.zones) };
}

function isStale(measured: MeasuredUsage | undefined, lastResetAt: string | null): boolean {
  if (measured?.at === undefined || lastResetAt === null) return false;
  return Date.parse(measured.at) <= Date.parse(lastResetAt);
}

export function renderSessionTelemetry(settings: ZoneSettings, inputs: ZoneInputs, actionFor: (zone: Zone) => string): string {
  const { reading, percentage, zone } = readZone(settings, inputs);
  return renderTelemetryBlock({ turn: inputs.turns, turnCeiling: redStartTurn(settings.config.telemetry.zones), usagePercentage: percentage, usage: reading, zone, action: actionFor(zone) });
}
