import { CAPABILITY_IDS, type CapabilityDefinition, type CapabilityId, type CapabilityLimitation, type CapabilityProfile, type CapabilityState, type CapabilityStatus, type SupportInput, type SupportLevel, type VersionProbe } from '../contracts/harness.js';

const unverifiedFloorImpact = 'The minimum harness version is unverified, so version compatibility cannot be claimed.';

function definitionsById(capabilities: readonly CapabilityDefinition[]): ReadonlyMap<CapabilityId, CapabilityDefinition> {
  return new Map(capabilities.map((capability) => [capability.id, capability]));
}

function gatedState(definition: CapabilityDefinition | undefined, version: VersionProbe | undefined): CapabilityState {
  if (!definition) return 'unknown';
  if (definition.state !== 'supported') return definition.state;
  if (!version?.minimumVersion || version.status === 'resolved') return definition.state;
  return 'unknown';
}

function completeCapabilities(input: SupportInput): CapabilityStatus[] {
  const definitions = definitionsById(input.capabilities);
  return CAPABILITY_IDS.map((id) => ({ id, state: gatedState(definitions.get(id), input.version) }));
}

function versionImpact(capability: CapabilityId, version: VersionProbe): string {
  if (version.status === 'old') {
    const detected = version.normalized ?? version.display ?? 'unknown';
    return `Detected version ${detected} is older than minimum ${version.minimumVersion}; ${capability} is not guaranteed.`;
  }
  return `The harness version could not be verified against minimum ${version.minimumVersion}; ${capability} is not guaranteed.`;
}

function limitationFor(status: CapabilityStatus, definition: CapabilityDefinition | undefined, version: VersionProbe | undefined): CapabilityLimitation | null {
  if (status.state === 'supported') return null;
  if (definition?.state === 'supported' && version?.minimumVersion) return { capability: status.id, impact: versionImpact(status.id, version) };
  const impact = definition?.impact ?? `The ${status.id} capability is not guaranteed by this integration.`;
  return { capability: status.id, impact };
}

function capabilityLimitations(input: SupportInput, capabilities: readonly CapabilityStatus[]): CapabilityLimitation[] {
  const definitions = definitionsById(input.capabilities);
  return capabilities.map((status) => limitationFor(status, definitions.get(status.id), input.version)).filter((limitation): limitation is CapabilityLimitation => limitation !== null);
}

function floorLimitation(version: VersionProbe | undefined): CapabilityLimitation | null {
  if (!version || version.minimumVersion !== null) return null;
  return { capability: 'pre_tool_block', impact: unverifiedFloorImpact };
}

export function allCapabilities(capabilities: readonly CapabilityStatus[]): boolean {
  return CAPABILITY_IDS.every((id) => capabilities.some((capability) => capability.id === id && capability.state === 'supported'));
}

function deriveLevel(capabilities: readonly CapabilityStatus[]): SupportLevel {
  const block = capabilities.find((capability) => capability.id === 'pre_tool_block');
  if (block?.state !== 'supported') return 'cooperative';
  return allCapabilities(capabilities) ? 'full' : 'partial';
}

export function deriveSupportProfile(input: SupportInput): CapabilityProfile {
  const capabilities = completeCapabilities(input);
  const limitations = capabilityLimitations(input, capabilities);
  const unverifiedFloor = floorLimitation(input.version);
  if (unverifiedFloor) limitations.push(unverifiedFloor);
  return { harness: input.harness, supportLevel: deriveLevel(capabilities), minimumVersion: input.version?.minimumVersion ?? null, capabilities, limitations };
}
