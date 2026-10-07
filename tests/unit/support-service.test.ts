import { describe, expect, it } from 'vitest';
import { CAPABILITY_IDS, CAPABILITY_STATES, SUPPORT_LEVELS, type CapabilityDefinition, type CapabilityState, type SupportLevel } from '../../src/core/contracts/harness.js';
import { deriveSupportProfile } from '../../src/core/services/support-service.js';
import { normalizeVersion } from '../../src/core/services/version-service.js';

const ALL_SUPPORTED: readonly CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: 'supported' }));
const FULL_SUPPORT = ['post_tool_telemetry', 'session_boot'] as const;

function capabilityCombinations(length: number): readonly CapabilityState[][] {
  if (length === 0) return [[]];
  return capabilityCombinations(length - 1).flatMap((combination) => CAPABILITY_STATES.map((state) => [...combination, state]));
}

function expectedLevel(states: readonly CapabilityState[]): SupportLevel {
  return FULL_SUPPORT.every((id) => states[CAPABILITY_IDS.indexOf(id)] === 'supported') ? 'full' : 'partial';
}

function profileFor(capabilities: readonly CapabilityDefinition[]) {
  return deriveSupportProfile({ harness: 'cursor', capabilities });
}

describe('exhaustive support-level derivation (prd-12 FR-07, DEC-08, TC-11)', () => {
  it('has exactly the four remaining capability IDs and two support levels', () => {
    expect([...CAPABILITY_IDS]).toEqual(['post_tool_telemetry', 'session_boot', 'context_usage', 'auto_restart']);
    expect([...SUPPORT_LEVELS]).toEqual(['full', 'partial']);
  });

  it('derives every capability combination from post_tool_telemetry and session_boot', () => {
    const seen = new Set<SupportLevel>();
    for (const states of capabilityCombinations(CAPABILITY_IDS.length)) {
      const capabilities = CAPABILITY_IDS.map((id, index) => ({ id, state: states[index] ?? 'unknown' }));
      const profile = profileFor(capabilities);
      expect(profile.supportLevel).toBe(expectedLevel(states));
      seen.add(profile.supportLevel);
    }
    expect(seen).toEqual(new Set(SUPPORT_LEVELS));
  });

  it('never lets context_usage or auto_restart change the level', () => {
    for (const state of CAPABILITY_STATES) {
      const capabilities = ALL_SUPPORTED.map((capability) => (capability.id === 'context_usage' || capability.id === 'auto_restart' ? { ...capability, state } : capability));
      expect(profileFor(capabilities).supportLevel).toBe('full');
    }
  });

  it('is partial when session_boot is not supported', () => {
    const capabilities: CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: id === 'session_boot' ? 'unsupported' : 'supported' }));
    expect(profileFor(capabilities).supportLevel).toBe('partial');
  });
});

describe('support profiles: version gating and floor (RF9, TC-12)', () => {
  it('gates affected capabilities for an old prerelease (UT-15, CA-16)', () => {
    const version = normalizeVersion({ display: 'Harness 2.0.0-beta.1', minimumVersion: '2.0.0' });
    const profile = deriveSupportProfile({ harness: 'claude-code', capabilities: ALL_SUPPORTED, version });
    expect(version).toMatchObject({ status: 'old', display: 'Harness 2.0.0-beta.1', normalized: '2.0.0-beta.1', minimumVersion: '2.0.0' });
    expect(profile.supportLevel).toBe('partial');
    expect(profile.limitations).toContainEqual({ capability: 'post_tool_telemetry', impact: 'Detected version 2.0.0-beta.1 is older than minimum 2.0.0; post_tool_telemetry is not guaranteed.' });
  });

  it('reports an unverified version floor on post_tool_telemetry without inventing one (RF9, DEC-08)', () => {
    const version = normalizeVersion({ display: 'Harness 3.1.0' });
    const profile = deriveSupportProfile({ harness: 'pi', capabilities: ALL_SUPPORTED, version });
    expect(profile.minimumVersion).toBeNull();
    expect(profile.supportLevel).toBe('full');
    expect(profile.limitations).toContainEqual({ capability: 'post_tool_telemetry', impact: 'The minimum harness version is unverified, so version compatibility cannot be claimed.' });
  });
});
