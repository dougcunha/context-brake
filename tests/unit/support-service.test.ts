import { describe, expect, it } from 'vitest';
import { CAPABILITY_IDS, CAPABILITY_STATES, SUPPORT_LEVELS, type CapabilityDefinition, type CapabilityState } from '../../src/core/contracts/harness.js';
import { deriveSupportProfile } from '../../src/core/services/support-service.js';
import { normalizeVersion } from '../../src/core/services/version-service.js';

const ALL_SUPPORTED: readonly CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: 'supported' }));

function capabilityCombinations(length: number): readonly CapabilityState[][] {
  if (length === 0) return [[]];
  return capabilityCombinations(length - 1).flatMap((combination) => CAPABILITY_STATES.map((state) => [...combination, state]));
}

describe('support profiles: limitations and version gating (RF8, RF9)', () => {
  it('keeps Copilot partial when hook timeouts fail open (UT-14, CA-15)', () => {
    const timeoutImpact = 'A timed-out hook lets the tool call continue.';
    const capabilities: readonly CapabilityDefinition[] = ALL_SUPPORTED.map((capability) => capability.id === 'timeout_fail_closed' ? { ...capability, state: 'unsupported', impact: timeoutImpact } : capability);
    const profile = deriveSupportProfile({ harness: 'github-copilot-cli', capabilities });
    expect(profile.supportLevel).toBe('partial');
    expect(profile.limitations).toContainEqual({ capability: 'timeout_fail_closed', impact: timeoutImpact });
  });

  it('gates affected capabilities for an old prerelease (UT-15, CA-16)', () => {
    const version = normalizeVersion({ display: 'Harness 2.0.0-beta.1', minimumVersion: '2.0.0' });
    const profile = deriveSupportProfile({ harness: 'claude-code', capabilities: ALL_SUPPORTED, version });
    expect(version).toMatchObject({ status: 'old', display: 'Harness 2.0.0-beta.1', normalized: '2.0.0-beta.1', minimumVersion: '2.0.0' });
    expect(profile.minimumVersion).toBe('2.0.0');
    expect(profile.supportLevel).toBe('cooperative');
    expect(profile.limitations).toContainEqual({ capability: 'pre_tool_block', impact: 'Detected version 2.0.0-beta.1 is older than minimum 2.0.0; pre_tool_block is not guaranteed.' });
  });

  it('reports an unverified version floor without inventing one (RF9)', () => {
    const version = normalizeVersion({ display: 'Harness 3.1.0' });
    const profile = deriveSupportProfile({ harness: 'pi', capabilities: ALL_SUPPORTED, version });
    expect(profile.minimumVersion).toBeNull();
    expect(profile.supportLevel).toBe('full');
    expect(profile.limitations).toContainEqual({ capability: 'pre_tool_block', impact: 'The minimum harness version is unverified, so version compatibility cannot be claimed.' });
  });
});

describe('support profiles: exhaustive capability mapping (UT-18, CA-01, CA-15)', () => {
  it('maps every capability-state combination exhaustively (UT-18, CA-01, CA-15)', () => {
    const levels = new Set<string>();
    for (const states of capabilityCombinations(CAPABILITY_IDS.length)) {
      const capabilities = CAPABILITY_IDS.map((id, index) => ({ id, state: states[index] ?? 'unknown' }));
      const profile = deriveSupportProfile({ harness: 'cursor', capabilities });
      levels.add(profile.supportLevel);
      expect(SUPPORT_LEVELS).toContain(profile.supportLevel);
      if (states.includes('unknown')) expect(profile.supportLevel).not.toBe('full');
    }
    expect(levels).toEqual(new Set(SUPPORT_LEVELS));
    expect(deriveSupportProfile({ harness: 'cursor', capabilities: [] }).capabilities.every(({ state }) => state === 'unknown')).toBe(true);
  });
});
