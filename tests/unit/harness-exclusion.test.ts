import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { detectHarnesses } from '../../src/core/services/detection-service.js';
import { applyExclusion, hasSameHarnesses, resolveHarnessExclusion } from '../../src/core/services/harness-exclusion.js';

const PROJECT_EVIDENCE = { project: [{ origin: 'project' as const, kind: 'file', value: 'x' }] };

describe('resolveHarnessExclusion (prd-15 FR-05, FR-06, FR-07, TC-10)', () => {
  it('keeps the configured exclusion when no flag is given (FR-06, TC-10)', () => {
    expect(resolveHarnessExclusion({ configured: ['opencode'], include: [], exclude: [] }).excluded).toEqual(['opencode']);
  });
  it('adds the flagged harnesses, sorted and unique (FR-05, TC-10)', () => {
    const result = resolveHarnessExclusion({ configured: ['opencode'], include: [], exclude: ['cursor', 'opencode'] });
    expect(result.excluded).toEqual(['cursor', 'opencode']);
    expect(result.selection).toEqual({ exclude: ['cursor', 'opencode'] });
  });
  it('clears the exclusion of an included harness (FR-07, TC-10)', () => {
    const result = resolveHarnessExclusion({ configured: ['opencode', 'cursor'], include: ['opencode'], exclude: [] });
    expect(result.excluded).toEqual(['cursor']);
    expect(result.selection).toEqual({ include: ['opencode'], exclude: ['cursor'] });
  });
  it('feeds detection so an excluded harness is reported as excluded (FR-06, TC-10)', () => {
    const { selection } = resolveHarnessExclusion({ configured: ['opencode'], include: [], exclude: [] });
    const detections = detectHarnesses({ opencode: PROJECT_EVIDENCE, cursor: PROJECT_EVIDENCE }, selection);
    expect(detections.map((item) => [item.harness, item.state])).toEqual([['cursor', 'project'], ['opencode', 'excluded']]);
  });
  it('compares harness lists as sets (TC-10)', () => {
    expect(hasSameHarnesses(['cursor', 'opencode'], ['opencode', 'cursor'])).toBe(true);
    expect(hasSameHarnesses(['cursor'], [])).toBe(false);
  });
  it('writes, keeps, or omits the configuration key (FR-05, TC-10)', () => {
    expect(applyExclusion(DEFAULT_CONFIG, ['opencode']).excludedHarnesses).toEqual(['opencode']);
    expect(applyExclusion({ ...DEFAULT_CONFIG, excludedHarnesses: ['opencode'] }, undefined).excludedHarnesses).toEqual(['opencode']);
    expect('excludedHarnesses' in applyExclusion({ ...DEFAULT_CONFIG, excludedHarnesses: ['opencode'] }, [])).toBe(false);
  });
});
