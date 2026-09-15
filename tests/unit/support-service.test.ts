import { describe, expect, it } from 'vitest';
import { CAPABILITY_IDS, CAPABILITY_STATES, SUPPORT_LEVELS, type CapabilityDefinition, type CapabilityState, type SupportLevel } from '../../src/core/contracts/harness.js';
import { deriveSupportProfile } from '../../src/core/services/support-service.js';
import { normalizeVersion } from '../../src/core/services/version-service.js';

const ALL_SUPPORTED: readonly CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: 'supported' }));
const FULL_SUPPORT = ['pre_tool_block', 'tool_coverage', 'post_tool_telemetry', 'session_boot'] as const;

function capabilityCombinations(length: number): readonly CapabilityState[][] {
  if (length === 0) return [[]];
  return capabilityCombinations(length - 1).flatMap((combination) => CAPABILITY_STATES.map((state) => [...combination, state]));
}

function expectedLevel(states: readonly CapabilityState[]): SupportLevel {
  if (states[CAPABILITY_IDS.indexOf('pre_tool_block')] !== 'supported') return 'cooperative';
  const full = FULL_SUPPORT.every((id) => states[CAPABILITY_IDS.indexOf(id)] === 'supported');
  return full ? 'full' : 'partial';
}

function profileFor(capabilities: readonly CapabilityDefinition[]) {
  return deriveSupportProfile({ harness: 'cursor', capabilities });
}

describe('TC-01: exhaustive support-level derivation (FR-02, DEC-02)', () => {
  it('derives every capability combination from the four full-support capabilities', () => {
    const seen = new Set<SupportLevel>();
    for (const states of capabilityCombinations(CAPABILITY_IDS.length)) {
      const capabilities = CAPABILITY_IDS.map((id, index) => ({ id, state: states[index] ?? 'unknown' }));
      const profile = profileFor(capabilities);
      expect(profile.supportLevel).toBe(expectedLevel(states));
      seen.add(profile.supportLevel);
    }
    expect(seen).toEqual(new Set(SUPPORT_LEVELS));
  });

  it('never lets context_usage or timeout_fail_closed change the level (DEC-02)', () => {
    const base: CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: id === 'context_usage' || id === 'timeout_fail_closed' ? 'unsupported' : 'supported' }));
    for (const contextState of CAPABILITY_STATES) {
      for (const timeoutState of CAPABILITY_STATES) {
        const capabilities = base.map((capability) => {
          if (capability.id === 'context_usage') return { ...capability, state: contextState };
          if (capability.id === 'timeout_fail_closed') return { ...capability, state: timeoutState };
          return capability;
        });
        expect(profileFor(capabilities).supportLevel).toBe('full');
      }
    }
  });
});

describe('TC-01: pre_tool_block drives cooperative and partial (FR-02, DEC-02)', () => {
  it('is cooperative when pre_tool_block is unsupported or unknown (DEC-02)', () => {
    for (const state of ['unsupported', 'unknown'] as const) {
      const capabilities: CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: id === 'pre_tool_block' ? state : 'supported' }));
      expect(profileFor(capabilities).supportLevel).toBe('cooperative');
    }
  });

  it('is partial when pre_tool_block is supported but tool_coverage is not (DEC-02)', () => {
    const capabilities: CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: id === 'tool_coverage' ? 'unsupported' : 'supported' }));
    expect(profileFor(capabilities).supportLevel).toBe('partial');
  });

  it('stays full while only timeout_fail_closed is unsupported (FR-02, CA-15)', () => {
    const impact = 'A hook timeout lets the tool call proceed; a command failure without a timeout denies it.';
    const capabilities: CapabilityDefinition[] = ALL_SUPPORTED.map((capability) => capability.id === 'timeout_fail_closed' ? { ...capability, state: 'unsupported', impact } : capability);
    const profile = deriveSupportProfile({ harness: 'github-copilot-cli', capabilities });
    expect(profile.supportLevel).toBe('full');
    expect(profile.limitations).toContainEqual({ capability: 'timeout_fail_closed', impact });
  });
});

describe('support profiles: version gating and floor (RF9, TC-12)', () => {
  it('gates affected capabilities for an old prerelease (UT-15, CA-16)', () => {
    const version = normalizeVersion({ display: 'Harness 2.0.0-beta.1', minimumVersion: '2.0.0' });
    const profile = deriveSupportProfile({ harness: 'claude-code', capabilities: ALL_SUPPORTED, version });
    expect(version).toMatchObject({ status: 'old', display: 'Harness 2.0.0-beta.1', normalized: '2.0.0-beta.1', minimumVersion: '2.0.0' });
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
