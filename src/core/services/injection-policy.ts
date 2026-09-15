import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { Zone } from '../contracts/zones.js';

export type InjectionInput = {
  readonly telemetry: ContextBrakeConfig['telemetry'];
  readonly zone: Zone;
  readonly usagePercentage: number;
};

export function decideInjection(input: InjectionInput): boolean {
  if (input.telemetry.injectionMode === 'always') return true;
  return input.zone !== 'GREEN' || input.usagePercentage >= input.telemetry.activationThresholdPercentage;
}
