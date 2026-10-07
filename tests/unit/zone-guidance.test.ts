import { describe, expect, it } from 'vitest';
import type { SnapshotConfig } from '../../src/core/contracts/configuration.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';
import { resumeText, zoneAction } from '../../src/core/services/zone-guidance.js';

const WITH_COMMAND: SnapshotConfig = { triggerZone: 'RED', command: '/sdd-snapshot' };
const WITHOUT_COMMAND: SnapshotConfig = { triggerZone: 'RED' };
const RUN = 'run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]';
const RUN_NOW = 'run "/sdd-snapshot" now, then end reply with [REQUEST_SESSION_RESET]';
const KEEP_WORKING = 'keep working; finish the current unit before large new explorations';
const USAGE = { source: 'estimated', usedTokens: 90000, windowTokens: 128000, measuredTokens: null, windowOrigin: 'config' } as const;

describe('zone actions with a snapshot command (prd-12 FR-05, TC-07)', () => {
  it.each<[Zone, string]>([['GREEN', 'work normally'], ['YELLOW', KEEP_WORKING], ['RED', RUN], ['CRITICAL', RUN_NOW]])('uses the RED trigger in %s', (zone, expected) => {
    expect(zoneAction(zone, WITH_COMMAND)).toBe(expected);
  });
  it('starts at YELLOW when the trigger is YELLOW', () => {
    expect(zoneAction('YELLOW', { ...WITH_COMMAND, triggerZone: 'YELLOW' })).toBe(RUN);
    expect(zoneAction('GREEN', { ...WITH_COMMAND, triggerZone: 'YELLOW' })).toBe('work normally');
  });
  it('keeps a 200-character command block under 400 characters', () => {
    const action = zoneAction('CRITICAL', { triggerZone: 'RED', command: `/${'x'.repeat(199)}` });
    const block = renderTelemetryBlock({ turn: 12, turnCeiling: 12, usagePercentage: 100, usage: USAGE, zone: 'CRITICAL', action, debug: false });
    expect(block.length).toBeLessThan(400);
  });
});

describe('zone actions without a snapshot command (prd-12 FR-06, TC-07)', () => {
  it.each<[Zone, string]>([
    ['GREEN', 'work normally'],
    ['YELLOW', KEEP_WORKING],
    ['RED', 'finish or pause the current unit and tell the user what remains'],
    ['CRITICAL', 'stop starting new work; tell the user what remains'],
  ])('uses the generic action in %s without the reset marker', (zone, expected) => {
    expect(zoneAction(zone, WITHOUT_COMMAND)).toBe(expected);
    expect(zoneAction(zone, { ...WITHOUT_COMMAND, triggerZone: 'YELLOW' })).not.toContain('[REQUEST_SESSION_RESET]');
  });
  it('never mentions a plan, checkpoint, or blocked tools', () => {
    const texts = (['GREEN', 'YELLOW', 'RED', 'CRITICAL'] as const).flatMap((zone) => [zoneAction(zone, WITHOUT_COMMAND), zoneAction(zone, WITH_COMMAND)]);
    expect(texts.join('\n')).not.toMatch(/plan|checkpoint|blocked|allowed/i);
  });
});

describe('resume text (prd-12 FR-05, TC-07)', () => {
  it('names the resume command when configured', () => {
    expect(resumeText({ ...WITH_COMMAND, resumeCommand: '/sdd-orchestrate-flow' })).toBe('[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.');
  });
  it('is absent without a resume command', () => {
    expect(resumeText(WITH_COMMAND)).toBeNull();
    expect(resumeText(WITHOUT_COMMAND)).toBeNull();
  });
});
