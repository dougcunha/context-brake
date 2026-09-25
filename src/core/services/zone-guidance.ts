import type { CheckpointMode, PlanPresence, ZoneGuidance } from '../contracts/checkpoint-mode.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { ToolCall } from '../contracts/runtime.js';
import type { Zone } from '../contracts/zones.js';
import { renderBlockMessage, renderFailureBlockMessage } from './block-message.js';
import { isToolCallAllowed } from './brake-allowlist.js';
import { delegatedGuidance } from './delegated-guidance.js';
import { compactZoneAction, isPlanAwareZone } from './zone-actions.js';

export type ValidationCommandSource = () => Promise<string | null>;
export type GuidanceSources = {
  readonly config: ContextBrakeConfig;
  readonly planPresence?: PlanPresence | undefined;
  readonly readValidationCommand: ValidationCommandSource;
  readonly zone?: Zone | undefined;
};

export async function resolveCheckpointMode(config: ContextBrakeConfig, presence: PlanPresence | undefined): Promise<CheckpointMode> {
  if (config.delegatedSnapshot === undefined || presence === undefined) return 'plan';
  return (await presence.exists()) ? 'plan' : 'delegated';
}
export async function resolveGuidance(sources: GuidanceSources): Promise<ZoneGuidance> {
  const section = sources.config.delegatedSnapshot;
  if (section === undefined) return planGuidance(sources, await isPlanPresentForActions(sources));
  const planPresent = sources.planPresence === undefined ? true : await sources.planPresence.exists();
  return planPresent ? planGuidance(sources, true) : delegatedGuidance(sources.config, section);
}
async function isPlanPresentForActions(sources: GuidanceSources): Promise<boolean> {
  if (sources.planPresence === undefined || sources.zone === undefined || !isPlanAwareZone(sources.zone)) return true;
  return sources.planPresence.exists();
}
export async function resolveFailureGuidance(sources: GuidanceSources): Promise<ZoneGuidance> {
  try {
    return await resolveGuidance(sources);
  } catch {
    return unionGuidance(sources);
  }
}
export function planGuidance(sources: GuidanceSources, planPresent = true): ZoneGuidance {
  const { config } = sources;
  return {
    mode: 'plan',
    actionFor: (zone) => compactZoneAction(zone, planPresent),
    allows: (call) => isPlanCallAllowed(call, sources),
    denyMessage: (input) => renderBlockMessage({ ...input, config }),
    failureMessage: (tool) => renderFailureBlockMessage({ tool, config }),
    resumeText: null,
  };
}
async function isPlanCallAllowed(call: ToolCall, sources: GuidanceSources): Promise<boolean> {
  const validationCommand = call.category === 'shell' ? await sources.readValidationCommand() : null;
  return isToolCallAllowed(call, { config: sources.config, validationCommand });
}
function unionGuidance(sources: GuidanceSources): ZoneGuidance {
  const plan = planGuidance(sources);
  const section = sources.config.delegatedSnapshot;
  if (section === undefined) return plan;
  const delegated = delegatedGuidance(sources.config, section);
  return { ...delegated, allows: async (call) => (await delegated.allows(call)) || plan.allows(call) };
}
