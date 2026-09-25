import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { UsageReading, Zone } from '../../src/core/contracts/zones.js';
import { compactZoneAction } from '../../src/core/services/zone-actions.js';
import { renderTelemetryBlock, TELEMETRY_BLOCK_VERSION } from '../../src/core/services/telemetry-block.js';

const RED_START_TURN = 100;

function read(usedTokens: number, windowTokens: number): UsageReading {
  return { source: 'estimated', usedTokens, windowTokens, measuredTokens: usedTokens };
}
function measured(usedTokens: number, windowTokens: number): UsageReading {
  return { source: 'measured', usedTokens, windowTokens, measuredTokens: usedTokens };
}

describe('telemetry block v2 (RF12, RF15, RF16, CA-01, CA-09, CA-10, NFR-04)', () => {
  it('declares version 2', () => {
    expect(TELEMETRY_BLOCK_VERSION).toBe(2);
  });
  it('renders the documented example line', () => {
    const block = renderTelemetryBlock({ turn: 9, turnCeiling: null, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW', action: compactZoneAction('YELLOW', true) });
    expect(block).toBe('[ContextBrake v2] turn=9 usage=55% tokens=70400/128000 source=estimated zone=YELLOW action=finish the current edit, start no new step, run the step validation');
  });
  it('marks a measured reading with the same value the harness reported', () => {
    const block = renderTelemetryBlock({ turn: 7, turnCeiling: null, usagePercentage: 42, usage: measured(54000, 128000), zone: 'GREEN', action: compactZoneAction('GREEN', false) });
    expect(block).toBe('[ContextBrake v2] turn=7 usage=42% tokens=54000/128000 source=measured zone=GREEN action=work normally');
  });
  it('renders a null usage without a token value as zero', () => {
    const usage: UsageReading = { source: 'measured', usedTokens: null, windowTokens: 128000, measuredTokens: null };
    const block = renderTelemetryBlock({ turn: 1, turnCeiling: null, usagePercentage: 0, usage, zone: 'GREEN', action: compactZoneAction('GREEN', true) });
    expect(block).toContain('tokens=0/128000 source=measured');
  });
  it('keeps the byte order of the fields', () => {
    const block = renderTelemetryBlock({ turn: 9, turnCeiling: null, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW', action: compactZoneAction('YELLOW', true) });
    const order = ['[ContextBrake v2]', 'turn=', 'usage=', 'tokens=', 'source=', 'zone=', 'action='];
    const positions = order.map((token) => block.indexOf(token));
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });
});

describe('telemetry block turn rendering (FR-03, DEC-04, TC-05)', () => {
  it('omits the ceiling when the default configuration has no turn limits', () => {
    expect(DEFAULT_CONFIG.telemetry.zones.yellowMaxTurn).toBeUndefined();
    const block = renderTelemetryBlock({ turn: 12, turnCeiling: null, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW', action: compactZoneAction('YELLOW', true) });
    expect(block).toContain('[ContextBrake v2] turn=12 usage=55%');
  });
  it('shows the turn where RED starts when turn limits are on', () => {
    const block = renderTelemetryBlock({ turn: 12, turnCeiling: RED_START_TURN, usagePercentage: 10, usage: read(12800, 128000), zone: 'GREEN', action: compactZoneAction('GREEN', true) });
    expect(block).toContain('[ContextBrake v2] turn=12/100 usage=10%');
  });
});

describe('telemetry block plan-aware actions (FR-08, DEC-05, TC-07)', () => {
  it.each<{ zone: Zone; planPresent: boolean; action: string }>([
    { zone: 'GREEN', planPresent: true, action: 'work normally' },
    { zone: 'GREEN', planPresent: false, action: 'work normally' },
    { zone: 'YELLOW', planPresent: true, action: 'finish the current edit, start no new step, run the step validation' },
    { zone: 'YELLOW', planPresent: false, action: 'keep working; finish the current unit before large new explorations' },
    { zone: 'RED', planPresent: true, action: 'save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]' },
    { zone: 'RED', planPresent: false, action: 'finish or pause the current unit, record progress, end reply with [REQUEST_SESSION_RESET]' },
    { zone: 'CRITICAL', planPresent: true, action: 'other tools are blocked; finish the RED actions' },
    { zone: 'CRITICAL', planPresent: false, action: 'other tools are blocked; finish the RED actions' },
  ])('renders the $zone action with planPresent=$planPresent', ({ zone, planPresent, action }) => {
    const block = renderTelemetryBlock({ turn: 4, turnCeiling: null, usagePercentage: 30, usage: read(38400, 128000), zone, action: compactZoneAction(zone, planPresent) });
    expect(block.endsWith(`zone=${zone} action=${action}`)).toBe(true);
  });
  it.each(['YELLOW', 'RED'] as const)('never tells a %s session without a plan to stop starting work', (zone) => {
    const block = renderTelemetryBlock({ turn: 4, turnCeiling: null, usagePercentage: 60, usage: read(76800, 128000), zone, action: compactZoneAction(zone, false) });
    expect(block).not.toMatch(/start no new|do not start|stop/i);
  });
});
