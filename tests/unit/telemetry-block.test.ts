import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, DEFAULT_SNAPSHOT } from '../../src/core/contracts/configuration.js';
import type { UsageReading, Zone } from '../../src/core/contracts/zones.js';
import { renderTelemetryBlock, TELEMETRY_BLOCK_VERSION } from '../../src/core/services/telemetry-block.js';
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
  it('declares version 3', () => {
    expect(TELEMETRY_BLOCK_VERSION).toBe(3);
  });
  it('renders the documented example line', () => {
    const block = renderTelemetryBlock({ turn: 9, turnCeiling: null, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW', action: action('YELLOW'), debug: false });
    expect(block).toBe('[ContextBrake v3] turn=9 usage=55% tokens=70400/128000 source=estimated window=config zone=YELLOW action=keep working; finish the current unit before large new explorations');
  });
  it('marks a measured reading with the same value the harness reported', () => {
    const block = renderTelemetryBlock({ turn: 7, turnCeiling: null, usagePercentage: 42, usage: measured(54000, 128000), zone: 'GREEN', action: action('GREEN'), debug: false });
    expect(block).toBe('[ContextBrake v3] turn=7 usage=42% tokens=54000/128000 source=measured window=harness zone=GREEN action=work normally');
  });
  it('renders a null usage without a token value as zero', () => {
    const usage: UsageReading = { source: 'measured', usedTokens: null, windowTokens: 128000, measuredTokens: null, windowOrigin: 'config' };
    const block = renderTelemetryBlock({ turn: 1, turnCeiling: null, usagePercentage: 0, usage, zone: 'GREEN', action: action('GREEN'), debug: false });
    expect(block).toContain('tokens=0/128000 source=measured');
  });
  it('keeps the byte order of the fields', () => {
    const block = renderTelemetryBlock({ turn: 9, turnCeiling: null, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW', action: action('YELLOW'), debug: false });
    const order = ['[ContextBrake v3]', 'turn=', 'usage=', 'tokens=', 'source=', 'window=', 'zone=', 'action='];
    const positions = order.map((token) => block.indexOf(token));
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });
});

describe('telemetry block debug line (FR-06, DEC-07, TC-09)', () => {
  const input = { turn: 9, turnCeiling: null, usagePercentage: 42, usage: measured(53760, 128000), zone: 'GREEN' as const, action: action('GREEN') };
  it('appends the prefilled line with the values of that same block', () => {
    expect(renderTelemetryBlock({ ...input, debug: true })).toBe(
      `${renderTelemetryBlock({ ...input, debug: false })} debug_line="📊 ContextBrake: 42% · 53760/128000 (harness) · measured · GREEN" (end your reply with this line)`,
    );
  });
  it('keeps the block without the debug mode byte-identical to the documented line', () => {
    expect(renderTelemetryBlock({ ...input, debug: false })).toBe('[ContextBrake v3] turn=9 usage=42% tokens=53760/128000 source=measured window=harness zone=GREEN action=work normally');
  });
  it('renders a null reading as zero inside the debug line', () => {
    const usage: UsageReading = { source: 'measured', usedTokens: null, windowTokens: 128000, measuredTokens: null, windowOrigin: 'config' };
    expect(renderTelemetryBlock({ ...input, usage, debug: true })).toContain('debug_line="📊 ContextBrake: 42% · 0/128000 (config) · measured · GREEN"');
  });
});

describe('telemetry block turn rendering (FR-03, DEC-04, TC-05)', () => {
  it('omits the ceiling when the default configuration has no turn limits', () => {
    expect(DEFAULT_CONFIG.telemetry.zones.yellowMaxTurn).toBeUndefined();
    const block = renderTelemetryBlock({ turn: 12, turnCeiling: null, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW', action: action('YELLOW'), debug: false });
    expect(block).toContain('[ContextBrake v3] turn=12 usage=55%');
  });
  it('shows the turn where RED starts when turn limits are on', () => {
    const block = renderTelemetryBlock({ turn: 12, turnCeiling: RED_START_TURN, usagePercentage: 10, usage: read(12800, 128000), zone: 'GREEN', action: action('GREEN'), debug: false });
    expect(block).toContain('[ContextBrake v3] turn=12/100 usage=10%');
  });
});
