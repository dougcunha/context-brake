import { describe, expect, it } from 'vitest';
import { DEFAULT_SNAPSHOT } from '../../src/core/contracts/configuration.js';
import type { UsageReading, Zone } from '../../src/core/contracts/zones.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';
import { zoneAction } from '../../src/core/services/zone-guidance.js';

const RED_START_TURN = 100;

function action(zone: Zone): string {
  return zoneAction(zone, DEFAULT_SNAPSHOT);
}
function read(usedTokens: number, windowTokens: number): UsageReading {
  return { source: 'estimated', usedTokens, windowTokens, measuredTokens: usedTokens, windowOrigin: 'config' };
}
function measured(usedTokens: number, windowTokens: number): UsageReading {
  return { source: 'measured', usedTokens, windowTokens, measuredTokens: usedTokens, windowOrigin: 'harness' };
}

describe('telemetry block v3 (RF12, RF15, RF16, CA-01, CA-09, CA-10, NFR-04, prd-09 FR-06, TC-06)', () => {
  it('renders the documented example line', () => {
    const block = renderTelemetryBlock({ turn: 9, turnCeiling: null, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW', action: action('YELLOW'), debug: false });
    expect(block).toBe('[ContextBrake v3] turn=9 usage=55% tokens=70400/128000 source=estimated window=config zone=YELLOW action=keep working; finish the current unit before large new explorations');
  });
  it('marks a measured reading with the same value the harness reported', () => {
    const block = renderTelemetryBlock({ turn: 7, turnCeiling: null, usagePercentage: 42, usage: measured(54000, 128000), zone: 'GREEN', action: action('GREEN'), debug: false });
    expect(block).toBe('[ContextBrake v3] turn=7 usage=42% tokens=54000/128000 source=measured window=harness zone=GREEN action=work normally');
  });
});

describe('telemetry block debug line (FR-06, DEC-07, TC-09)', () => {
  const input = { turn: 9, turnCeiling: null, usagePercentage: 42, zone: 'GREEN' as const, action: action('GREEN'), debug: true };
  it('appends the prefilled line with the values of that same block', () => {
    expect(renderTelemetryBlock({ ...input, usage: measured(53760, 128000) })).toBe(
      '[ContextBrake v3] turn=9 usage=42% tokens=53760/128000 source=measured window=harness zone=GREEN action=work normally debug_line="📊 ContextBrake: 42% · 53760/128000 (harness) · measured · GREEN" (end your reply with this line)',
    );
  });
  it('renders a null usage as zero tokens in the block and the debug line', () => {
    const usage: UsageReading = { source: 'measured', usedTokens: null, windowTokens: 128000, measuredTokens: null, windowOrigin: 'config' };
    expect(renderTelemetryBlock({ ...input, usage })).toBe(
      '[ContextBrake v3] turn=9 usage=42% tokens=0/128000 source=measured window=config zone=GREEN action=work normally debug_line="📊 ContextBrake: 42% · 0/128000 (config) · measured · GREEN" (end your reply with this line)',
    );
  });
});

describe('telemetry block turn rendering (FR-03, DEC-04, TC-05)', () => {
  it.each<[number | null, string]>([
    [null, '[ContextBrake v3] turn=12 usage=10%'],
    [RED_START_TURN, '[ContextBrake v3] turn=12/100 usage=10%'],
  ])('renders the turn with RED start %s as %s', (turnCeiling, expected) => {
    const block = renderTelemetryBlock({ turn: 12, turnCeiling, usagePercentage: 10, usage: read(12800, 128000), zone: 'GREEN', action: action('GREEN'), debug: false });
    expect(block).toContain(expected);
  });
});
