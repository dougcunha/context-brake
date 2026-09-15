import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { type Zone } from '../../src/core/contracts/zones.js';
import { classifyZone } from '../../src/core/services/zone-classifier.js';
import { renderProtocol } from '../../src/core/services/protocol-service.js';

const GREEN_MARKER = 'Usage below ';
const YELLOW_MARKER = 'Usage from ';
const RED_MARKER = 'Usage above ';
const CRITICAL_MARKER = 'Usage at ';

type Boundaries = {
  readonly greenMaxPercentage: number;
  readonly yellowMinPercentage: number;
  readonly yellowMaxPercentage: number;
  readonly redMinPercentage: number;
  readonly criticalMinPercentage: number;
  readonly criticalTurn: number;
};

function zoneRow(config: ContextBrakeConfig, zone: Zone): string {
  const row = renderProtocol(config).split('\n').find((line) => line.startsWith(`| \`${zone}\``));
  if (!row) throw new Error(`Missing protocol row for ${zone}`);
  return row;
}
function rowNumbers(config: ContextBrakeConfig, zone: Zone): number[] {
  const source = { GREEN: GREEN_MARKER, YELLOW: YELLOW_MARKER, RED: RED_MARKER, CRITICAL: CRITICAL_MARKER }[zone];
  return [...(zoneRow(config, zone).split(source)[1] ?? '').matchAll(/\d+/g)].map((match) => Number(match[0]));
}
function renderBoundaries(config: ContextBrakeConfig): Boundaries {
  const green = rowNumbers(config, 'GREEN');
  const yellow = rowNumbers(config, 'YELLOW');
  const critical = rowNumbers(config, 'CRITICAL');
  const yellowMaxPercentage = yellow[1] ?? 0;
  return { greenMaxPercentage: (green[0] ?? 0) - 1, yellowMinPercentage: yellow[0] ?? 0, yellowMaxPercentage, redMinPercentage: yellowMaxPercentage + 1, criticalMinPercentage: critical[0] ?? 0, criticalTurn: critical[1] ?? 0 };
}
function withZones(config: ContextBrakeConfig, zones: ContextBrakeConfig['telemetry']['zones']): ContextBrakeConfig {
  return { ...config, telemetry: { ...config.telemetry, zones, turnCeiling: zones.criticalTurn } };
}
function customZones(): ContextBrakeConfig['telemetry']['zones'][] {
  return [
    { greenMaxPercentage: 19, yellowMaxPercentage: 39, criticalPercentage: 59, greenMaxTurn: 5, yellowMaxTurn: 9, criticalTurn: 15 },
    { greenMaxPercentage: 60, yellowMaxPercentage: 70, criticalPercentage: 95, greenMaxTurn: 3, yellowMaxTurn: 6, criticalTurn: 30 },
  ];
}
function expectCoherent(config: ContextBrakeConfig): void {
  const zones = config.telemetry.zones;
  const rendered = renderBoundaries(config);
  expect(rendered.greenMaxPercentage).toBe(zones.greenMaxPercentage);
  expect(rendered.yellowMaxPercentage).toBe(zones.yellowMaxPercentage);
  expect(rendered.criticalMinPercentage).toBe(zones.criticalPercentage);
  expect(rendered.criticalTurn).toBe(zones.criticalTurn);
  expect(rendered.yellowMinPercentage).toBe(rendered.greenMaxPercentage + 1);
  expect(rendered.redMinPercentage).toBe(rendered.yellowMaxPercentage + 1);
  expect(rendered.redMinPercentage).toBeLessThan(rendered.criticalMinPercentage);
  expect(zoneRow(config, 'RED')).toContain(`Usage above ${rendered.yellowMaxPercentage}%`);
  expect(classifyZone({ usagePercentage: rendered.greenMaxPercentage, turns: 0 }, zones)).toBe('GREEN');
  expect(classifyZone({ usagePercentage: rendered.yellowMinPercentage, turns: 0 }, zones)).toBe('YELLOW');
  expect(classifyZone({ usagePercentage: rendered.yellowMaxPercentage, turns: 0 }, zones)).toBe('YELLOW');
  expect(classifyZone({ usagePercentage: rendered.redMinPercentage, turns: 0 }, zones)).toBe('RED');
  expect(classifyZone({ usagePercentage: rendered.criticalMinPercentage - 1, turns: 0 }, zones)).not.toBe('CRITICAL');
  expect(classifyZone({ usagePercentage: rendered.criticalMinPercentage, turns: 0 }, zones)).toBe('CRITICAL');
  expect(classifyZone({ usagePercentage: 0, turns: rendered.criticalTurn }, zones)).toBe('CRITICAL');
  expect(classifyZone({ usagePercentage: 0, turns: rendered.criticalTurn - 1 }, zones)).not.toBe('CRITICAL');
}

describe('protocol and classifier coherence (RF9, CA-04, TC-02)', () => {
  it('classifies the default boundaries printed by the protocol at the boundary and one below', () => {
    expectCoherent(DEFAULT_CONFIG);
  });
  it('keeps protocol boundaries and classification equal for two custom configurations', () => {
    for (const zones of customZones()) expectCoherent(withZones(DEFAULT_CONFIG, zones));
  });
});
