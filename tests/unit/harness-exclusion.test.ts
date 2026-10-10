import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { detectHarnesses } from '../../src/core/services/detection-service.js';
import { applyExclusion, hasSameHarnesses, resolveHarnessExclusion } from '../../src/core/services/harness-exclusion.js';

const PROJECT_EVIDENCE = { project: [{ origin: 'project' as const, kind: 'file', value: 'x' }] };
type ExclusionCase = { name: string; configured: HarnessId[]; include: HarnessId[]; exclude: HarnessId[]; excluded: HarnessId[]; selection: object };
const EXCLUSION_CASES: ExclusionCase[] = [
  { name: 'keeps the configured exclusion when no flag is given (FR-06, TC-10)', configured: ['opencode'], include: [], exclude: [], excluded: ['opencode'], selection: { exclude: ['opencode'] } },
  { name: 'adds the flagged harnesses, sorted and unique (FR-05, TC-10)', configured: ['opencode'], include: [], exclude: ['cursor', 'opencode'], excluded: ['cursor', 'opencode'], selection: { exclude: ['cursor', 'opencode'] } },
  { name: 'clears the exclusion of an included harness (FR-07, TC-10)', configured: ['opencode', 'cursor'], include: ['opencode'], exclude: [], excluded: ['cursor'], selection: { include: ['opencode'], exclude: ['cursor'] } },
];

describe('resolveHarnessExclusion (prd-15 FR-05, FR-06, FR-07, TC-10)', () => {
  it.each(EXCLUSION_CASES)('$name', ({ configured, include, exclude, excluded, selection }) => {
    expect(resolveHarnessExclusion({ configured, include, exclude })).toEqual({ excluded, selection });
  });
  it('feeds detection so an excluded harness is reported as excluded (FR-06, TC-10)', () => {
    const { selection } = resolveHarnessExclusion({ configured: ['opencode'], include: [], exclude: [] });
    const detections = detectHarnesses({ opencode: PROJECT_EVIDENCE, cursor: PROJECT_EVIDENCE }, selection);
    expect(detections.map((item) => [item.harness, item.state])).toEqual([['cursor', 'project'], ['opencode', 'excluded']]);
  });
  it('compares harness lists as sets (TC-10)', () => {
    expect(hasSameHarnesses(['cursor', 'opencode'], ['opencode', 'cursor'])).toBe(true);
    expect(hasSameHarnesses([], ['cursor'])).toBe(false);
  });
  it('writes, keeps, or omits the configuration key (FR-05, TC-10)', () => {
    expect(applyExclusion(DEFAULT_CONFIG, ['opencode']).excludedHarnesses).toEqual(['opencode']);
    expect(applyExclusion({ ...DEFAULT_CONFIG, excludedHarnesses: ['opencode'] }, undefined).excludedHarnesses).toEqual(['opencode']);
    expect('excludedHarnesses' in applyExclusion({ ...DEFAULT_CONFIG, excludedHarnesses: ['opencode'] }, [])).toBe(false);
  });
});
