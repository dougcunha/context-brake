import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import type { UsageReading } from '../../src/core/contracts/zones.js';
import { delegatedAction } from '../../src/core/services/delegated-guidance.js';
import { renderTelemetryBlock } from '../../src/core/services/telemetry-block.js';
import { isTrustedWindow, telemetryAction, UNTRUSTED_CRITICAL_ACTION } from '../../src/core/services/window-trust.js';
import { compactZoneAction } from '../../src/core/services/zone-actions.js';

const CRITICAL_PLAN = compactZoneAction('CRITICAL', true);
const WORST_CASE: UsageReading = { source: 'estimated', usedTokens: 9999999, windowTokens: 1000000, measuredTokens: 9999999, windowOrigin: 'config' };

describe('warning-only action at CRITICAL (prd-09 FR-06, DEC-06, TC-07)', () => {
  it('replaces the blocking action when the window came from the fallback', () => {
    expect(telemetryAction('CRITICAL', 'config', CRITICAL_PLAN)).toBe(UNTRUSTED_CRITICAL_ACTION);
    expect(UNTRUSTED_CRITICAL_ACTION).not.toMatch(/\bblocked;|are blocked/);
    expect(UNTRUSTED_CRITICAL_ACTION).toContain('context-brake doctor');
  });
  it.each(['harness', 'declared'] as const)('keeps the blocking action with a %s window', (origin) => {
    expect(telemetryAction('CRITICAL', origin, CRITICAL_PLAN)).toBe(CRITICAL_PLAN);
  });
  it('keeps actions that do not promise blocking', () => {
    expect(telemetryAction('RED', 'config', compactZoneAction('RED', true))).toBe(compactZoneAction('RED', true));
    expect(telemetryAction('CRITICAL', 'config', delegatedAction('/snapshot'))).toBe(delegatedAction('/snapshot'));
  });
  it('keeps the worst-case warning-only block within the v3 budget (TC-06)', () => {
    const block = renderTelemetryBlock({ turn: 99999, turnCeiling: 100000, usagePercentage: 999, usage: WORST_CASE, zone: 'CRITICAL', action: UNTRUSTED_CRITICAL_ACTION, debug: false });
    expect(block.length).toBeLessThanOrEqual(220);
    expect(getEncoding('o200k_base').encode(block).length).toBeLessThanOrEqual(60);
  });
  it('costs at most 10 tokens for the window field (NFR-02)', () => {
    expect(getEncoding('o200k_base').encode(' window=declared').length).toBeLessThanOrEqual(10);
  });
});

describe('trusted window origins (prd-09 FR-01, DEC-03)', () => {
  it.each([['harness', true], ['declared', true], ['config', false], [undefined, false]] as const)('treats %s as trusted=%s', (origin, trusted) => {
    expect(isTrustedWindow(origin)).toBe(trusted);
  });
});
