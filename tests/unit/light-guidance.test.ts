import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { ZONES, type UsageReading } from '../../src/core/contracts/zones.js';
import { lightAction } from '../../src/core/services/light-guidance.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';
import { resolveCheckpointMode, resolveFailureGuidance, resolveGuidance } from '../../src/core/services/zone-guidance.js';
import { CountingPresence, SNAPSHOT_SECTION } from '../helpers/delegated-fixtures.js';

const SAVE_NOW = 'save your snapshot or checkpoint now, then end reply with [REQUEST_SESSION_RESET]';
const SAVE_IMMEDIATELY = 'save your snapshot or checkpoint immediately, then end reply with [REQUEST_SESSION_RESET]';
const KEEP_WORKING = 'keep working; finish the current unit before large new explorations';
const FORBIDDEN = /\/|task_plan|state_checkpoint|validation|commit|blocked/;
const WORST_CASE: UsageReading = { source: 'estimated', usedTokens: 9999999, windowTokens: 1000000, measuredTokens: 9999999, windowOrigin: 'declared' };
const encoding = getEncoding('o200k_base');
const lightConfig: ContextBrakeConfig = { ...DEFAULT_CONFIG, lightMode: { triggerZone: 'RED' }, delegatedSnapshot: SNAPSHOT_SECTION };

describe('light actions per zone and trigger (TC-02, FR-05, DEC-04)', () => {
  it.each([
    ['GREEN', 'RED', 'work normally'],
    ['YELLOW', 'RED', KEEP_WORKING],
    ['RED', 'RED', SAVE_NOW],
    ['CRITICAL', 'RED', SAVE_IMMEDIATELY],
    ['GREEN', 'YELLOW', 'work normally'],
    ['YELLOW', 'YELLOW', SAVE_NOW],
    ['RED', 'YELLOW', SAVE_NOW],
    ['CRITICAL', 'YELLOW', SAVE_IMMEDIATELY],
  ] as const)('%s with trigger %s', (zone, triggerZone, action) => {
    expect(lightAction(zone, { triggerZone })).toBe(action);
  });
  it('never names a skill, command, state file, validation, commit, or block', () => {
    for (const zone of ZONES) for (const triggerZone of ['YELLOW', 'RED'] as const) expect(lightAction(zone, { triggerZone })).not.toMatch(FORBIDDEN);
  });
});

describe('light telemetry block budget (TC-02, FR-03, NFR-04)', () => {
  it.each(ZONES)('keeps the worst-case %s block within 60 tokens and 220 characters', (zone) => {
    const block = renderTelemetryBlock({ turn: 99999, turnCeiling: 100000, usagePercentage: 999, usage: WORST_CASE, zone, action: lightAction(zone, { triggerZone: 'YELLOW' }) });
    expect(block).toMatch(/^\[ContextBrake v3\] turn=\S+ usage=\S+ tokens=\S+ source=\S+ window=\S+ zone=\S+ action=/);
    expect(block.length).toBeLessThanOrEqual(220);
    expect(encoding.encode(block).length).toBeLessThanOrEqual(60);
  });
});

describe('light mode resolution without port calls (TC-03, FR-01, FR-02, NFR-02)', () => {
  it('resolves light mode over a present plan and a delegated section', async () => {
    const presence = new CountingPresence(true);
    expect(await resolveCheckpointMode(lightConfig, presence)).toBe('light');
    expect(presence.calls).toBe(0);
  });
  it('returns the light guidance without reading the plan or the validation command', async () => {
    const presence = new CountingPresence(true);
    let validationReads = 0;
    const sources = { config: lightConfig, planPresence: presence, zone: 'RED' as const, readValidationCommand: async () => { validationReads += 1; return 'npm test'; } };
    const guidance = await resolveGuidance(sources);
    const failure = await resolveFailureGuidance(sources);
    expect([guidance.mode, failure.mode]).toEqual(['light', 'light']);
    expect(guidance.actionFor('RED')).toBe(SAVE_NOW);
    expect(await guidance.allows({ name: 'Write', category: 'file_write', paths: ['src/app.ts'], command: null })).toBe(true);
    expect(guidance.resumeText).toBeNull();
    expect([presence.calls, validationReads]).toEqual([0, 0]);
  });
});
