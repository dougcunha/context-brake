import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { CapabilityDefinition } from '../contracts/harness.js';
import type { EstimationConstants } from '../contracts/runtime.js';
import type { UsageReading, Zone } from '../contracts/zones.js';
import type { SessionSummary } from './session-counters.js';
import { estimatedTokens, resolveUsage } from './usage-resolver.js';
import { acceptsDeclaredWindow } from './window-trust.js';
import { classifyZone, usagePercentage } from './zone-classifier.js';

export type MeasuredUsage = { readonly tokens: number | null; readonly contextWindow: number | null; readonly at?: string | undefined };
export type ZoneSettings = { readonly descriptor: { readonly estimation: EstimationConstants; readonly capabilities: readonly CapabilityDefinition[] }; readonly config: Pick<ContextBrakeConfig, 'telemetry' | 'debug'> };
export type ZoneInputs = { readonly summary: SessionSummary; readonly turns: number; readonly observedCharacters: number; readonly measured?: MeasuredUsage | undefined };
export type ZoneReading = { readonly reading: UsageReading; readonly estimate: number; readonly percentage: number; readonly zone: Zone };

export function readZone(settings: ZoneSettings, inputs: ZoneInputs): ZoneReading {
  const estimated = { observedCharacters: inputs.summary.observedCharacters + inputs.observedCharacters, turns: inputs.turns };
  const measured = mergeMeasurements(inputs);
  const { contextWindowCeiling, declaredContextWindow } = settings.config.telemetry;
  const declared = acceptsDeclaredWindow(settings.descriptor.capabilities) ? declaredContextWindow : undefined;
  const reading = resolveUsage({ estimated, measured, constants: settings.descriptor.estimation, contextWindowCeiling, declaredContextWindow: declared });
  const percentage = usagePercentage(reading.usedTokens ?? 0, reading.windowTokens);
  return { reading, estimate: estimatedTokens(estimated, settings.descriptor.estimation), percentage, zone: classifyZone({ usagePercentage: percentage, turns: inputs.turns }, settings.config.telemetry.zones) };
}

function mergeMeasurements(inputs: ZoneInputs): MeasuredUsage {
  const { lastResetAt, statusline } = inputs.summary;
  const transcript = isStale(inputs.measured, lastResetAt) ? undefined : inputs.measured;
  const bridge = isStale(statusline.usage ?? undefined, lastResetAt) ? undefined : statusline.usage;
  const tokens = transcript?.tokens ?? bridge?.tokens ?? null;
  const contextWindow = inputs.measured?.contextWindow ?? statusline.windowTokens;
  return { tokens, contextWindow };
}

function isStale(measured: Pick<MeasuredUsage, 'at'> | undefined, lastResetAt: string | null): boolean {
  if (measured?.at === undefined || lastResetAt === null) return false;
  return Date.parse(measured.at) <= Date.parse(lastResetAt);
}
