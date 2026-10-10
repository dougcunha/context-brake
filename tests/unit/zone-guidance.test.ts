import { describe, expect, it } from 'vitest';
import type { SnapshotConfig } from '../../src/core/contracts/configuration.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import type { RestartMode } from '../../src/core/services/restart-mode.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';
import { resumeText, zoneAction } from '../../src/core/services/zone-guidance.js';

const WITH_COMMAND: SnapshotConfig = { triggerZone: 'RED', command: '/sdd-snapshot' };
const WITHOUT_COMMAND: SnapshotConfig = { triggerZone: 'RED' };
const RUN = 'run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]';
const RUN_NOW = 'run "/sdd-snapshot" now, then end reply with [REQUEST_SESSION_RESET]';
const KEEP_WORKING = 'keep working; finish the current unit before large new explorations';
const HANDOFF = 'save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]';
const USAGE = { source: 'estimated', usedTokens: 90000, windowTokens: 128000, measuredTokens: null, windowOrigin: 'config' } as const;

describe('zone actions with a snapshot command (prd-12 FR-05, TC-07)', () => {
  it.each<[Zone, string]>([['GREEN', 'work normally'], ['YELLOW', KEEP_WORKING], ['RED', RUN], ['CRITICAL', RUN_NOW]])('uses the RED trigger in %s', (zone, expected) => {
    expect(zoneAction(zone, WITH_COMMAND)).toBe(expected);
  });
  it('starts at YELLOW when the trigger is YELLOW', () => {
    expect(zoneAction('YELLOW', { ...WITH_COMMAND, triggerZone: 'YELLOW' })).toBe(RUN);
    expect(zoneAction('GREEN', { ...WITH_COMMAND, triggerZone: 'YELLOW' })).toBe('work normally');
  });
});

describe('zone actions without a snapshot command and restart off (prd-12 FR-06, TC-07; prd-14 TC-01)', () => {
  it.each<[Zone, string]>([
    ['RED', 'finish or pause the current unit and tell the user what remains'],
    ['CRITICAL', 'stop starting new work; tell the user what remains'],
  ])('uses the generic action in %s without the reset marker', (zone, expected) => {
    expect(zoneAction(zone, WITHOUT_COMMAND)).toBe(expected);
    expect(zoneAction(zone, { ...WITHOUT_COMMAND, triggerZone: 'YELLOW' })).not.toContain('[REQUEST_SESSION_RESET]');
  });
});

describe('zone actions with restart on (prd-14 FR-01, NFR-05, TC-01)', () => {
  it.each<{ zone: Zone; mode: RestartMode; snapshot: SnapshotConfig; expected: string }>([
    { zone: 'RED', mode: 'handoff', snapshot: WITHOUT_COMMAND, expected: HANDOFF },
    { zone: 'CRITICAL', mode: 'handoff', snapshot: WITHOUT_COMMAND, expected: HANDOFF },
    { zone: 'CRITICAL', mode: 'snapshot', snapshot: WITH_COMMAND, expected: RUN_NOW },
  ])('asks in $zone with restart mode $mode for the handoff or the snapshot command', ({ zone, mode, snapshot, expected }) => {
    expect(zoneAction(zone, snapshot, mode)).toBe(expected);
  });
  it('renders the exact RED block in handoff mode', () => {
    const block = renderTelemetryBlock({ turn: 12, turnCeiling: 12, usagePercentage: 70, usage: USAGE, zone: 'RED', action: zoneAction('RED', WITHOUT_COMMAND, 'handoff'), debug: false });
    expect(block).toBe(`[ContextBrake v3] turn=12/12 usage=70% tokens=90000/128000 source=estimated window=config zone=RED action=${HANDOFF}`);
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
