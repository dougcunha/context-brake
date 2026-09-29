import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { EstimationConstants } from '../contracts/runtime.js';
import type { UsageReading, WindowOrigin } from '../contracts/zones.js';

export const CHARACTERS_PER_TOKEN = 4;

export type UsageResolutionInput = {
  readonly estimated: {
    readonly observedCharacters: number;
    readonly turns: number;
  };
  readonly measured?: { readonly tokens: number | null; readonly contextWindow: number | null } | undefined;
  readonly constants: EstimationConstants;
  readonly contextWindowCeiling: number;
  readonly declaredContextWindow?: number | undefined;
};

export function estimatedTokens(input: UsageResolutionInput['estimated'], constants: EstimationConstants): number {
  return constants.baselineTokens + Math.ceil(input.observedCharacters / CHARACTERS_PER_TOKEN) + input.turns * constants.tokensPerTurn;
}
export function resolveUsage(input: UsageResolutionInput): UsageReading {
  const estimate = estimatedTokens(input.estimated, input.constants);
  const measured = input.measured;
  if (measured && measured.tokens !== null) {
    return { source: 'measured', usedTokens: measured.tokens, measuredTokens: measured.tokens, ...resolveWindow(input) };
  }
  return { source: 'estimated', usedTokens: estimate, measuredTokens: estimate, ...resolveWindow(input) };
}
function resolveWindow(input: UsageResolutionInput): { readonly windowTokens: number; readonly windowOrigin: WindowOrigin } {
  const reported = input.measured?.contextWindow ?? null;
  if (reported !== null) return { windowTokens: reported, windowOrigin: 'harness' };
  if (input.declaredContextWindow !== undefined) return { windowTokens: input.declaredContextWindow, windowOrigin: 'declared' };
  return { windowTokens: input.contextWindowCeiling, windowOrigin: 'config' };
}
export function resolveUsageWithConfig(input: Omit<UsageResolutionInput, 'contextWindowCeiling'>, config: ContextBrakeConfig): UsageReading {
  return resolveUsage({ ...input, contextWindowCeiling: config.telemetry.contextWindowCeiling });
}
