import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';
import { ZONE_ACTIONS } from '../../src/core/services/zone-actions.js';
import { resolveCheckpointMode, resolveGuidance } from '../../src/core/services/zone-guidance.js';
import { CountingPresence, delegatedConfig } from '../helpers/delegated-fixtures.js';

const ACTION = 'run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]';
const USAGE = { source: 'estimated', usedTokens: 90000, windowTokens: 128000, measuredTokens: null } as const;
async function guidanceFor(present: boolean, section = {}) {
  return resolveGuidance({ config: delegatedConfig(section), planPresence: new CountingPresence(present), readValidationCommand: async () => null });
}

describe('checkpoint mode resolution (TC-03, FR-01)', () => {
  it('stays in plan mode without the section and never checks the plan file', async () => {
    const presence = new CountingPresence(false);
    expect(await resolveCheckpointMode(DEFAULT_CONFIG, presence)).toBe('plan');
    expect(presence.calls).toBe(0);
  });
  it('uses delegated mode only when the plan file is missing', async () => {
    expect(await resolveCheckpointMode(delegatedConfig(), new CountingPresence(false))).toBe('delegated');
    expect(await resolveCheckpointMode(delegatedConfig(), new CountingPresence(true))).toBe('plan');
  });
});

describe('delegated zone actions (TC-03, FR-03, FR-04, FR-05, NFR-05)', () => {
  it.each<[Zone, string]>([['GREEN', ZONE_ACTIONS.GREEN.compact], ['YELLOW', ZONE_ACTIONS.YELLOW.compact], ['RED', ACTION], ['CRITICAL', ACTION]])('uses the default RED trigger in %s', async (zone, expected) => {
    expect((await guidanceFor(false)).actionFor(zone)).toBe(expected);
  });
  it('starts at YELLOW when configured', async () => {
    expect((await guidanceFor(false, { triggerZone: 'YELLOW' })).actionFor('YELLOW')).toBe(ACTION);
  });
  it('keeps the plan actions while the plan file exists', async () => {
    expect((await guidanceFor(true)).actionFor('RED')).toBe(ZONE_ACTIONS.RED.compact);
  });
  it('renders a v1 block without plan, checkpoint, validation, or commit words', async () => {
    const action = (await guidanceFor(false)).actionFor('RED');
    const block = renderTelemetryBlock({ turn: 11, turnCeiling: 12, usagePercentage: 70, usage: USAGE, zone: 'RED', action });
    expect(block).toBe(`[ContextBrake v1] turn=11/12 usage=70% tokens=90000/128000 source=estimated zone=RED action=${ACTION}`);
    expect(block).not.toMatch(/task_plan|state_checkpoint|validation|commit/);
  });
  it('stays under 400 characters with a 200-character command', async () => {
    const action = (await guidanceFor(false, { snapshotCommand: 'x'.repeat(200) })).actionFor('CRITICAL');
    const block = renderTelemetryBlock({ turn: 12, turnCeiling: 12, usagePercentage: 100, usage: USAGE, zone: 'CRITICAL', action });
    expect(block.length).toBeLessThan(400);
  });
});
