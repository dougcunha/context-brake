import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import { classifyZone, usagePercentage } from '../../src/core/services/zone-classifier.js';

const ZONES = DEFAULT_CONFIG.telemetry.zones;

const boundaries: readonly { usage: number; turns: number; zone: Zone }[] = [
  { usage: 49, turns: 7, zone: 'GREEN' },
  { usage: 50, turns: 8, zone: 'YELLOW' },
  { usage: 65, turns: 10, zone: 'YELLOW' },
  { usage: 66, turns: 11, zone: 'RED' },
  { usage: 74, turns: 11, zone: 'RED' },
  { usage: 75, turns: 12, zone: 'CRITICAL' },
  { usage: 130, turns: 1, zone: 'CRITICAL' },
];

describe('zone classification boundaries (RF10, CA-03, TC-01)', () => {
  it.each(boundaries)('classifies usage $usage% with $turns turns as $zone', ({ usage, turns, zone }) => {
    expect(classifyZone({ usagePercentage: usage, turns }, ZONES)).toBe(zone);
  });
  it('takes the highest zone when usage and turns disagree', () => {
    expect(classifyZone({ usagePercentage: 90, turns: 2 }, ZONES)).toBe('CRITICAL');
    expect(classifyZone({ usagePercentage: 30, turns: 12 }, ZONES)).toBe('CRITICAL');
    expect(classifyZone({ usagePercentage: 70, turns: 1 }, ZONES)).toBe('RED');
    expect(classifyZone({ usagePercentage: 30, turns: 11 }, ZONES)).toBe('RED');
    expect(classifyZone({ usagePercentage: 60, turns: 1 }, ZONES)).toBe('YELLOW');
    expect(classifyZone({ usagePercentage: 30, turns: 8 }, ZONES)).toBe('YELLOW');
  });
  it('inherits the ceiling from the configuration instead of constants', () => {
    const custom: typeof ZONES = { ...ZONES, criticalPercentage: 90, criticalTurn: 20 };
    expect(classifyZone({ usagePercentage: 75, turns: 12 }, custom)).toBe('RED');
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
    const custom: ContextBrakeConfig['telemetry']['zones'] = { greenMaxPercentage: 19, yellowMaxPercentage: 39, criticalPercentage: 59, greenMaxTurn: 5, yellowMaxTurn: 9, criticalTurn: 15 };
    expect(classifyZone({ usagePercentage: 20, turns: 6 }, custom)).toBe('YELLOW');
    expect(classifyZone({ usagePercentage: 40, turns: 10 }, custom)).toBe('RED');
    expect(classifyZone({ usagePercentage: 59, turns: 15 }, custom)).toBe('CRITICAL');
  });
});
