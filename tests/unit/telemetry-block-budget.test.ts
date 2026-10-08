import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { ZONES } from '../../src/core/contracts/zones.js';
import type { UsageReading } from '../../src/core/contracts/zones.js';
import { DEFAULT_SNAPSHOT, type SnapshotConfig } from '../../src/core/contracts/configuration.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';
import type { RestartMode } from '../../src/core/services/restart-mode.js';
import { zoneAction } from '../../src/core/services/zone-guidance.js';

const TOKEN_BUDGET = 60;
const DEBUG_TOKEN_BUDGET = 40;
const CHARACTER_BUDGET = 220;
const WORST_CASE_TURN = 99999;
const WORST_CASE_RED_START = 100000;
const WORST_CASE_WINDOW = 1000000;
const WORST_CASE_USED = 9999999;

const encoding = getEncoding('o200k_base');
const worstCase: UsageReading = { source: 'estimated', usedTokens: WORST_CASE_USED, windowTokens: WORST_CASE_WINDOW, measuredTokens: WORST_CASE_USED, windowOrigin: 'declared' };
const SNAPSHOTS: readonly { readonly name: string; readonly snapshot: SnapshotConfig; readonly mode?: RestartMode }[] = [
  { name: 'without a snapshot command', snapshot: DEFAULT_SNAPSHOT },
  { name: 'with a snapshot command', snapshot: { triggerZone: 'YELLOW', command: '/sdd-snapshot' } },
  { name: 'in handoff mode (prd-14 TC-01)', snapshot: { triggerZone: 'YELLOW' }, mode: 'handoff' },
];
const variants = ZONES.flatMap((zone) => SNAPSHOTS.map(({ name, snapshot, mode }) => ({ zone, name, snapshot, mode })));

describe('telemetry block v3 budget (CA-13, NFR-04, TC-06, prd-09 NFR-02)', () => {
  it.each(variants)('keeps the worst-case $zone block $name within the token and character budget', ({ zone, snapshot, mode }) => {
    const block = renderTelemetryBlock({ turn: WORST_CASE_TURN, turnCeiling: WORST_CASE_RED_START, usagePercentage: 999, usage: worstCase, zone, action: zoneAction(zone, snapshot, mode), debug: false });
    expect(block.length).toBeLessThanOrEqual(CHARACTER_BUDGET);
    expect(encoding.encode(block).length).toBeLessThanOrEqual(TOKEN_BUDGET);
  });
  it('adds at most 40 tokens for the debug line (NFR-03, TC-09)', () => {
    const input = { turn: WORST_CASE_TURN, turnCeiling: WORST_CASE_RED_START, usagePercentage: 999, usage: worstCase, zone: 'CRITICAL' as const, action: zoneAction('CRITICAL', SNAPSHOTS[1]!.snapshot) };
    const added = encoding.encode(renderTelemetryBlock({ ...input, debug: true })).length - encoding.encode(renderTelemetryBlock({ ...input, debug: false })).length;
    expect(added).toBeLessThanOrEqual(DEBUG_TOKEN_BUDGET);
  });
});
