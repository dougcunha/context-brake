import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DetectionSelection, HarnessId } from '../contracts/harness.js';

export type ExclusionInput = {
  readonly configured: readonly HarnessId[];
  readonly include: readonly HarnessId[];
  readonly exclude: readonly HarnessId[];
};
export type ResolvedExclusion = { readonly excluded: readonly HarnessId[]; readonly selection: DetectionSelection };

export function resolveHarnessExclusion(input: ExclusionInput): ResolvedExclusion {
  const included = new Set(input.include);
  const kept = input.configured.filter((harness) => !included.has(harness));
  const excluded = Array.from(new Set([...kept, ...input.exclude])).sort();
  const selection: DetectionSelection = {
    ...(input.include.length > 0 ? { include: input.include } : {}),
    ...(excluded.length > 0 ? { exclude: excluded } : {}),
  };
  return { excluded, selection };
}

export function hasSameHarnesses(left: readonly HarnessId[], right: readonly HarnessId[]): boolean {
  return left.length === right.length && left.every((harness) => right.includes(harness));
}

export function applyExclusion(config: ContextBrakeConfig, excluded: readonly HarnessId[] | undefined): ContextBrakeConfig {
  if (excluded === undefined) return config;
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'excludedHarnesses')) as ContextBrakeConfig;
  return excluded.length === 0 ? rest : { ...rest, excludedHarnesses: [...excluded] };
}
