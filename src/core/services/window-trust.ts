import type { CapabilityDefinition } from '../contracts/harness.js';
import type { WindowOrigin, Zone } from '../contracts/zones.js';
import { ZONE_ACTIONS } from './zone-actions.js';

export const UNTRUSTED_CRITICAL_ACTION = 'not blocked (no harness window, see context-brake doctor); finish the RED actions';

export function acceptsDeclaredWindow(capabilities: readonly CapabilityDefinition[]): boolean {
  return capabilities.find((entry) => entry.id === 'context_usage')?.state === 'unsupported';
}
export function isTrustedWindow(origin: WindowOrigin | undefined): boolean {
  return origin === 'harness' || origin === 'declared';
}
export function telemetryAction(zone: Zone, origin: WindowOrigin, action: string): string {
  if (zone !== 'CRITICAL' || isTrustedWindow(origin) || action !== ZONE_ACTIONS.CRITICAL.compact) return action;
  return UNTRUSTED_CRITICAL_ACTION;
}
