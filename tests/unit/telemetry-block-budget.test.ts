import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { ZONES } from '../../src/core/contracts/zones.js';
import type { UsageReading } from '../../src/core/contracts/zones.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';

const TOKEN_BUDGET = 50;
const CHARACTER_BUDGET = 220;
const WORST_CASE_TURN = 999;
const WORST_CASE_WINDOW = 1000000;
const WORST_CASE_USED = 9999999;

const encoding = getEncoding('o200k_base');
const worstCase: UsageReading = { source: 'estimated', usedTokens: WORST_CASE_USED, windowTokens: WORST_CASE_WINDOW, measuredTokens: WORST_CASE_USED };

describe('telemetry block budget (CA-13, TC-07)', () => {
  it.each([...ZONES])('keeps the worst-case %s block within the token and character budget', (zone) => {
    const block = renderTelemetryBlock({ turn: WORST_CASE_TURN, turnCeiling: 12, usagePercentage: 999, usage: worstCase, zone });
    expect(block.length).toBeLessThanOrEqual(CHARACTER_BUDGET);
    expect(encoding.encode(block).length).toBeLessThanOrEqual(TOKEN_BUDGET);
  });
});
