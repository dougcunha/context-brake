import type { CapabilityDefinition, CapabilityId } from '../contracts/harness.js';
import type { BrakeMode } from '../contracts/runtime.js';

export const REQUIRED_CAPABILITY_IDS: readonly CapabilityId[] = ['pre_tool_block', 'tool_coverage'];

export type BrakeModeResult = { readonly mode: BrakeMode; readonly reason: string | null };

export function deriveBrakeMode(capabilities: readonly CapabilityDefinition[]): BrakeModeResult {
  for (const id of REQUIRED_CAPABILITY_IDS) {
    const capability = capabilities.find((entry) => entry.id === id);
    if (capability?.state === 'supported') continue;
    return { mode: 'cooperative', reason: capability?.impact ?? `The ${id} capability is not guaranteed by this integration.` };
  }
  return { mode: 'enforced', reason: null };
}
