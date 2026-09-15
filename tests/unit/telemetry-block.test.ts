import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { UsageReading, Zone } from '../../src/core/contracts/zones.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';

const TURN_CEILING = DEFAULT_CONFIG.telemetry.turnCeiling;

function read(usedTokens: number, windowTokens: number): UsageReading {
  return { source: 'estimated', usedTokens, windowTokens, measuredTokens: usedTokens };
}
function measured(usedTokens: number, windowTokens: number): UsageReading {
  return { source: 'measured', usedTokens, windowTokens, measuredTokens: usedTokens };
}

describe('telemetry block v1 (RF12, RF15, RF16, CA-01, CA-09, CA-10, TC-06)', () => {
  it('renders the documented example line', () => {
    const block = renderTelemetryBlock({ turn: 9, turnCeiling: TURN_CEILING, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW' });
    expect(block).toBe('[ContextBrake v1] turn=9/12 usage=55% tokens=70400/128000 source=estimated zone=YELLOW action=finish the current edit, start no new step, run the step validation');
  });
  it.each<{ zone: Zone; action: string }>([
    { zone: 'GREEN', action: 'work normally' },
    { zone: 'YELLOW', action: 'finish the current edit, start no new step, run the step validation' },
    { zone: 'RED', action: 'save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]' },
    { zone: 'CRITICAL', action: 'other tools are blocked; finish the RED actions' },
  ])('renders the $zone action text', ({ zone, action }) => {
    const block = renderTelemetryBlock({ turn: 4, turnCeiling: TURN_CEILING, usagePercentage: 30, usage: read(38400, 128000), zone });
    expect(block).toContain(`zone=${zone} action=${action}`);
  });
  it('marks a measured reading with the same value the harness reported', () => {
    const block = renderTelemetryBlock({ turn: 7, turnCeiling: TURN_CEILING, usagePercentage: 42, usage: measured(54000, 128000), zone: 'GREEN' });
    expect(block).toBe('[ContextBrake v1] turn=7/12 usage=42% tokens=54000/128000 source=measured zone=GREEN action=work normally');
  });
  it('renders a null usage without a token value as zero', () => {
    const usage: UsageReading = { source: 'measured', usedTokens: null, windowTokens: 128000, measuredTokens: null };
    const block = renderTelemetryBlock({ turn: 1, turnCeiling: TURN_CEILING, usagePercentage: 0, usage, zone: 'GREEN' });
    expect(block).toContain('tokens=0/128000 source=measured');
  });
  it('keeps the byte order of the fields', () => {
    const block = renderTelemetryBlock({ turn: 9, turnCeiling: TURN_CEILING, usagePercentage: 55, usage: read(70400, 128000), zone: 'YELLOW' });
    const order = ['[ContextBrake v1]', 'turn=', 'usage=', 'tokens=', 'source=', 'zone=', 'action='];
    const positions = order.map((token) => block.indexOf(token));
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });
});

describe('telemetry block turn ceiling (TC-06)', () => {
  it('uses the configured ceiling in the turn field', () => {
    const block = renderTelemetryBlock({ turn: 2, turnCeiling: 20, usagePercentage: 10, usage: read(100, 1000), zone: 'GREEN' });
    expect(block).toContain('turn=2/20');
  });
});
