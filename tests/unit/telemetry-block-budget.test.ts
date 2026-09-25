import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { ZONES } from '../../src/core/contracts/zones.js';
import type { UsageReading } from '../../src/core/contracts/zones.js';
import { compactZoneAction } from '../../src/core/services/zone-actions.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';

const TOKEN_BUDGET = 60;
const CHARACTER_BUDGET = 220;
const WORST_CASE_TURN = 99999;
const WORST_CASE_RED_START = 100000;
const WORST_CASE_WINDOW = 1000000;
const WORST_CASE_USED = 9999999;

const encoding = getEncoding('o200k_base');
const worstCase: UsageReading = { source: 'estimated', usedTokens: WORST_CASE_USED, windowTokens: WORST_CASE_WINDOW, measuredTokens: WORST_CASE_USED };
const variants = ZONES.flatMap((zone) => [true, false].map((planPresent) => ({ zone, planPresent })));

describe('telemetry block v2 budget (CA-13, NFR-04, TC-06)', () => {
  it.each(variants)('keeps the worst-case $zone block with planPresent=$planPresent within the token and character budget', ({ zone, planPresent }) => {
    const block = renderTelemetryBlock({ turn: WORST_CASE_TURN, turnCeiling: WORST_CASE_RED_START, usagePercentage: 999, usage: worstCase, zone, action: compactZoneAction(zone, planPresent) });
    expect(block.length).toBeLessThanOrEqual(CHARACTER_BUDGET);
    expect(encoding.encode(block).length).toBeLessThanOrEqual(TOKEN_BUDGET);
  });
});
