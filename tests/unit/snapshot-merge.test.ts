import { describe, expect, it } from 'vitest';
import { applySnapshot, mergeSnapshot } from '../../src/core/services/snapshot-merge.js';

const FLAGS = { clearCommand: false } as const;
const CURRENT = { triggerZone: 'YELLOW', command: '/s', resumeCommand: '/r' } as const;

describe('snapshot section merge (prd-12 FR-04, TC-05)', () => {
  it('keeps the section without snapshot flags', () => {
    expect(mergeSnapshot(CURRENT, FLAGS)).toEqual({ update: { kind: 'keep' } });
  });
  it('sets a trigger zone without a command', () => {
    expect(mergeSnapshot(undefined, { ...FLAGS, triggerZone: 'YELLOW' })).toEqual({ update: { kind: 'set', section: { triggerZone: 'YELLOW' } } });
  });
  it('overrides only the given fields', () => {
    expect(mergeSnapshot(CURRENT, { ...FLAGS, command: '/new' })).toEqual({ update: { kind: 'set', section: { ...CURRENT, command: '/new' } } });
  });
  it('clears both commands and keeps the trigger zone', () => {
    expect(mergeSnapshot(CURRENT, { clearCommand: true })).toEqual({ update: { kind: 'set', section: { triggerZone: 'YELLOW' } } });
  });
  it('rejects clearing together with a command flag', () => {
    expect(mergeSnapshot(CURRENT, { clearCommand: true, command: '/x' })).toHaveProperty('error');
  });
  it('reports an invalid trigger with the section path', () => {
    expect(mergeSnapshot(undefined, { ...FLAGS, triggerZone: 'GREEN' })).toEqual({ error: expect.stringContaining('snapshot.triggerZone') });
  });
  it('applies a set update and leaves the config alone on keep', () => {
    const config = { snapshot: CURRENT };
    expect(applySnapshot(config, { kind: 'keep' })).toBe(config);
    expect(applySnapshot(config, { kind: 'set', section: { triggerZone: 'RED' } })).toEqual({ snapshot: { triggerZone: 'RED' } });
  });
});
