import { describe, expect, it } from 'vitest';
import { describeSnapshot } from '../../src/cli/output/doctor-mode-text.js';
import { mergeSnapshot } from '../../src/core/services/snapshot-merge.js';
import { describeTrigger } from '../../src/core/services/trigger-text.js';

const FLAGS = { clearCommand: false } as const;

describe('snapshot merge with a trigger percentage', () => {
  it('sets the percentage over the current section', () => {
    expect(mergeSnapshot({ triggerZone: 'RED' }, { ...FLAGS, triggerPercentage: 70 })).toEqual({ update: { kind: 'set', section: { triggerZone: 'RED', triggerPercentage: 70 } } });
  });
  it('drops the percentage when a zone is set, so no stale value stays', () => {
    const current = { triggerZone: 'RED', triggerPercentage: 70 } as const;
    expect(mergeSnapshot(current, { ...FLAGS, triggerZone: 'YELLOW' })).toEqual({ update: { kind: 'set', section: { triggerZone: 'YELLOW' } } });
  });
  it('keeps the percentage when clearing the commands', () => {
    const current = { triggerZone: 'RED', triggerPercentage: 70, command: 's' } as const;
    expect(mergeSnapshot(current, { clearCommand: true })).toEqual({ update: { kind: 'set', section: { triggerZone: 'RED', triggerPercentage: 70 } } });
  });
  it('reports an invalid percentage with its flag', () => {
    expect(mergeSnapshot(undefined, { ...FLAGS, triggerPercentage: 101 })).toEqual({ error: expect.stringContaining('--snapshot-trigger-percentage <1-100>') });
  });
});

describe('texts that name the trigger', () => {
  it('describes a percentage or the zone', () => {
    expect(describeTrigger({ triggerZone: 'RED', triggerPercentage: 65 })).toBe('65% of the context window');
    expect(describeTrigger({ triggerZone: 'YELLOW', triggerPercentage: null })).toBe('YELLOW');
  });
  it('shows the percentage in the doctor snapshot value', () => {
    const snapshot = { triggerZone: 'RED', triggerPercentage: 65, command: 'sdd-snapshot', resumeCommand: null } as const;
    expect(describeSnapshot(snapshot)).toBe('sdd-snapshot at 65% of the context window');
  });
});
