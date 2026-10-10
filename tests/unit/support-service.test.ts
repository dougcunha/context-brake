import { describe, expect, it } from 'vitest';
import { CAPABILITY_IDS, CAPABILITY_STATES, SUPPORT_LEVELS, type CapabilityDefinition, type CapabilityState, type SupportLevel, type VersionProbe, type VersionStatus } from '../../src/core/contracts/harness.js';
import { deriveSupportProfile } from '../../src/core/services/support-service.js';

const ALL_SUPPORTED: readonly CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: 'supported' }));
const FULL_SUPPORT = ['post_tool_telemetry', 'session_boot'] as const;
const FLOOR = '2.0.0';
const UNVERIFIED_FLOOR = { capability: 'post_tool_telemetry', impact: 'The minimum harness version is unverified, so version compatibility cannot be claimed.' };

function capabilityCombinations(length: number): readonly CapabilityState[][] {
  if (length === 0) return [[]];
  return capabilityCombinations(length - 1).flatMap((combination) => CAPABILITY_STATES.map((state) => [...combination, state]));
}

function expectedLevel(states: readonly CapabilityState[]): SupportLevel {
  return FULL_SUPPORT.every((id) => states[CAPABILITY_IDS.indexOf(id)] === 'supported') ? 'full' : 'partial';
}

function probe(status: VersionStatus, minimumVersion: string | null): VersionProbe {
  const normalized = status === 'old' ? '2.0.0-beta.1' : null;
  return { status, display: normalized, normalized, source: 'executable', minimumVersion };
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
      const profile = deriveSupportProfile({ harness: 'cursor', capabilities });
      expect(profile.supportLevel).toBe(expectedLevel(states));
      seen.add(profile.supportLevel);
    }
    expect(seen).toEqual(new Set(SUPPORT_LEVELS));
  });
});

describe('support profiles: version gating and floor (RF9, TC-12)', () => {
  it('gates every declared capability for an old prerelease (UT-15, CA-16, TC-08)', () => {
    const profile = deriveSupportProfile({ harness: 'claude-code', capabilities: ALL_SUPPORTED, version: probe('old', FLOOR) });
    expect(profile.supportLevel).toBe('partial');
    expect(profile.capabilities).toEqual(CAPABILITY_IDS.map((id) => ({ id, state: 'unknown' })));
    expect(profile.limitations).toEqual(CAPABILITY_IDS.map((capability) => ({ capability, impact: `Detected version 2.0.0-beta.1 is older than minimum 2.0.0; ${capability} is not guaranteed.` })));
  });

  it.each([
    { status: 'resolved', floor: FLOOR, limitations: [] },
    { status: 'unknown', floor: FLOOR, limitations: [] },
    { status: 'malformed', floor: FLOOR, limitations: [] },
    { status: 'timed_out', floor: FLOOR, limitations: [] },
    { status: 'unknown', floor: null, limitations: [UNVERIFIED_FLOOR] },
    { status: 'malformed', floor: null, limitations: [UNVERIFIED_FLOOR] },
    { status: 'timed_out', floor: null, limitations: [UNVERIFIED_FLOOR] },
  ] as const)('keeps the declared states for a $status probe with floor $floor (FR-12, DEC-07, TC-08)', ({ status, floor, limitations }) => {
    const profile = deriveSupportProfile({ harness: 'claude-code', capabilities: ALL_SUPPORTED, version: probe(status, floor) });
    expect(profile.supportLevel).toBe('full');
    expect(profile.limitations).toEqual(limitations);
  });

  it('reports an unverified version floor on post_tool_telemetry without inventing one (RF9, DEC-08)', () => {
    const profile = deriveSupportProfile({ harness: 'pi', capabilities: ALL_SUPPORTED, version: { ...probe('resolved', null), normalized: '3.1.0' } });
    expect(profile.minimumVersion).toBeNull();
    expect(profile.supportLevel).toBe('full');
    expect(profile.limitations).toEqual([UNVERIFIED_FLOOR]);
  });
});
