import type { CapabilityDefinition } from '../contracts/harness.js';

export function acceptsDeclaredWindow(capabilities: readonly CapabilityDefinition[]): boolean {
  return capabilities.find((entry) => entry.id === 'context_usage')?.state === 'unsupported';
}
