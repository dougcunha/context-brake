import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import { classifyZone, redStartTurn, turnLimits, usagePercentage } from '../../src/core/services/zone-classifier.js';

const ZONES = DEFAULT_CONFIG.telemetry.zones;

const TURN_LIMITS = { ...ZONES, greenMaxTurn: 59, yellowMaxTurn: 99 };

const boundaries: readonly { usage: number; zone: Zone }[] = [
  { usage: 49, zone: 'GREEN' },
  { usage: 50, zone: 'YELLOW' },
  { usage: 65, zone: 'YELLOW' },
  { usage: 66, zone: 'RED' },
  { usage: 74, zone: 'RED' },
  { usage: 75, zone: 'CRITICAL' },
  { usage: 130, zone: 'CRITICAL' },
];

describe('usage-only zone classification boundaries (FR-01, TC-01)', () => {
  it.each(boundaries)('classifies usage $usage% as $zone regardless of turns', ({ usage, zone }) => {
    expect(classifyZone({ usagePercentage: usage, turns: 1 }, ZONES)).toBe(zone);
    expect(classifyZone({ usagePercentage: usage, turns: 500 }, ZONES)).toBe(zone);
  });
  it('never reaches CRITICAL by turns alone with the default configuration', () => {
    expect(classifyZone({ usagePercentage: 74, turns: 500 }, ZONES)).toBe('RED');
    expect(classifyZone({ usagePercentage: 30, turns: 10000 }, ZONES)).toBe('GREEN');
    expect(classifyZone({ usagePercentage: 75, turns: 1 }, ZONES)).toBe('CRITICAL');
  });
  it('inherits the ceiling from the configuration instead of constants', () => {
    const custom: typeof ZONES = { ...ZONES, criticalPercentage: 90 };
    expect(classifyZone({ usagePercentage: 75, turns: 12 }, custom)).toBe('RED');
  });
});

describe('optional turn limits raise the zone up to RED (FR-02, TC-02)', () => {
  it.each([
    { turns: 59, zone: 'GREEN' },
    { turns: 60, zone: 'YELLOW' },
    { turns: 99, zone: 'YELLOW' },
    { turns: 100, zone: 'RED' },
    { turns: 10000, zone: 'RED' },
  ] as const)('classifies $turns turns at 10% usage as $zone', ({ turns, zone }) => {
    expect(classifyZone({ usagePercentage: 10, turns }, TURN_LIMITS)).toBe(zone);
  });
  it('takes the highest zone when usage and turns disagree', () => {
    expect(classifyZone({ usagePercentage: 90, turns: 2 }, TURN_LIMITS)).toBe('CRITICAL');
    expect(classifyZone({ usagePercentage: 60, turns: 1 }, TURN_LIMITS)).toBe('YELLOW');
    expect(classifyZone({ usagePercentage: 60, turns: 100 }, TURN_LIMITS)).toBe('RED');
  });
  it('reports the turn limits and the RED start only when both are set', () => {
    expect(turnLimits(ZONES)).toBeNull();
    expect(redStartTurn(ZONES)).toBeNull();
    expect(turnLimits(TURN_LIMITS)).toEqual({ greenMaxTurn: 59, yellowMaxTurn: 99 });
    expect(redStartTurn(TURN_LIMITS)).toBe(100);
    expect(turnLimits({ ...ZONES, greenMaxTurn: 5 })).toBeNull();
  });
});

describe('usage percentage arithmetic (DEC-03, TC-28)', () => {
  it('floors the ratio of used to window tokens', () => {
    expect(usagePercentage(62720, 128000)).toBe(49);
    expect(usagePercentage(64000, 128000)).toBe(50);
    expect(usagePercentage(83711, 128000)).toBe(65);
    expect(usagePercentage(84480, 128000)).toBe(66);
    expect(usagePercentage(166400, 128000)).toBe(130);
  });
  it('guards against a zero or negative window', () => {
    expect(usagePercentage(100, 0)).toBe(100);
    expect(usagePercentage(100, -1)).toBe(100);
  });
});

describe('configuration zone limits stay authoritative (RF9, CA-04)', () => {
  it('classifies with custom percentages and turns', () => {
    const custom: ContextBrakeConfig['telemetry']['zones'] = { greenMaxPercentage: 19, yellowMaxPercentage: 39, criticalPercentage: 59, greenMaxTurn: 5, yellowMaxTurn: 9 };
    expect(classifyZone({ usagePercentage: 1, turns: 6 }, custom)).toBe('YELLOW');
    expect(classifyZone({ usagePercentage: 1, turns: 10 }, custom)).toBe('RED');
    expect(classifyZone({ usagePercentage: 59, turns: 1 }, custom)).toBe('CRITICAL');
  });
  it('ignores the deprecated critical turn of a legacy configuration (FR-09)', () => {
    const legacy: ContextBrakeConfig['telemetry']['zones'] = { ...ZONES, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 };
    expect(classifyZone({ usagePercentage: 30, turns: 12 }, legacy)).toBe('RED');
    expect(classifyZone({ usagePercentage: 30, turns: 500 }, legacy)).toBe('RED');
  });
});
