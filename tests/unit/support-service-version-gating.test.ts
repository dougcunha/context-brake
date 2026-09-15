import { describe, expect, it } from 'vitest';
import type { CapabilityDefinition } from '../../src/core/contracts/harness.js';
import { CAPABILITY_IDS } from '../../src/core/contracts/harness.js';
import { deriveSupportProfile } from '../../src/core/services/support-service.js';
import { normalizeVersion } from '../../src/core/services/version-service.js';

const ALL_SUPPORTED: readonly CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: 'supported' }));

describe('TC-08: only an old probe downgrades declared capabilities (FR-12, DEC-07)', () => {
  it('keeps declared capability states for unknown, malformed, and timed_out probes with a floor set', () => {
    const cases = [
      normalizeVersion({ display: null, minimumVersion: '2.0.0' }),
      normalizeVersion({ display: 'not a version string', minimumVersion: '2.0.0' }),
      { status: 'timed_out' as const, display: null, normalized: null, source: 'executable' as const, minimumVersion: '2.0.0' },
    ];
    for (const version of cases) {
      const profile = deriveSupportProfile({ harness: 'claude-code', capabilities: ALL_SUPPORTED, version });
      expect(profile.supportLevel).toBe('full');
      expect(profile.limitations.some((l) => l.capability === 'pre_tool_block' && l.impact.startsWith('Detected version'))).toBe(false);
    }
  });

  it('downgrades declared capabilities only when the probe is old', () => {
    const oldVersion = normalizeVersion({ display: 'Harness 1.0.0', minimumVersion: '2.0.0' });
    expect(deriveSupportProfile({ harness: 'claude-code', capabilities: ALL_SUPPORTED, version: oldVersion }).supportLevel).toBe('cooperative');
  });

  it('preserves declared capability states regardless of status when no floor is set', () => {
    for (const version of [
      normalizeVersion({ display: null }),
      normalizeVersion({ display: 'garbage' }),
      { status: 'timed_out' as const, display: null, normalized: null, source: 'executable' as const, minimumVersion: null },
    ]) {
      expect(deriveSupportProfile({ harness: 'claude-code', capabilities: ALL_SUPPORTED, version }).supportLevel).toBe('full');
    }
  });
});
