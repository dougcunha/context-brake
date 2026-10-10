import { describe, expect, it } from 'vitest';
import { applySnapshot, mergeSnapshot } from '../../src/core/services/snapshot-merge.js';

const FLAGS = { clearCommand: false } as const;
const CURRENT = { triggerZone: 'YELLOW', command: '/s', resumeCommand: '/r' } as const;

describe('snapshot section merge (prd-12 FR-04, TC-05)', () => {
  it('keeps the section without snapshot flags', () => {
    expect(mergeSnapshot(CURRENT, FLAGS)).toEqual({ update: { kind: 'keep' } });
  });
  it.each([
    { name: 'a trigger zone without a command', current: undefined, flags: { ...FLAGS, triggerZone: 'YELLOW' }, section: { triggerZone: 'YELLOW' } },
    { name: 'only the given fields over the current section', current: CURRENT, flags: { ...FLAGS, command: '/new' }, section: { ...CURRENT, command: '/new' } },
    { name: 'the current trigger zone when clearing both commands', current: CURRENT, flags: { clearCommand: true }, section: { triggerZone: 'YELLOW' } },
    { name: 'the default trigger zone when clearing without a section', current: undefined, flags: { clearCommand: true }, section: { triggerZone: 'RED' } },
  ])('sets $name', ({ current, flags, section }) => {
    expect(mergeSnapshot(current, flags)).toEqual({ update: { kind: 'set', section } });
  });
  it('rejects clearing together with a command flag', () => {
    expect(mergeSnapshot(CURRENT, { clearCommand: true, command: '/x' })).toEqual({ error: '--no-snapshot-command cannot be combined with --snapshot-command or --resume-command.' });
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
