import { describe, expect, it } from 'vitest';
import type { AutoRestartConfig } from '../../src/core/contracts/auto-restart.js';
import { applyAutoRestart, isAutoRestartWanted, mergeAutoRestart } from '../../src/core/services/auto-restart-merge.js';

const NO_FLAGS = { autoRestart: false, noAutoRestart: false };
const CURRENT = { maxConsecutiveRestarts: 5 };
const ON = { maxConsecutiveRestarts: 2 };

describe('auto restart flag merge (prd-11 FR-07, DEC-09, TC-21)', () => {
  it('sets the block only when it is absent, and keeps an existing value (prd-16 FR-08, TC-01)', () => {
    expect(mergeAutoRestart(undefined, { ...NO_FLAGS, autoRestart: true })).toEqual({ update: { kind: 'set' } });
    expect(mergeAutoRestart(CURRENT, { ...NO_FLAGS, autoRestart: true })).toEqual({ update: { kind: 'keep' } });
  });

  it('removes the block only when it is present', () => {
    expect(mergeAutoRestart(CURRENT, { ...NO_FLAGS, noAutoRestart: true })).toEqual({ update: { kind: 'remove' } });
    expect(mergeAutoRestart(undefined, { ...NO_FLAGS, noAutoRestart: true })).toEqual({ update: { kind: 'keep' } });
  });

  it('keeps everything without a flag and rejects both flags together', () => {
    expect(mergeAutoRestart(CURRENT, NO_FLAGS)).toEqual({ update: { kind: 'keep' } });
    expect(mergeAutoRestart(undefined, { autoRestart: true, noAutoRestart: true })).toEqual({ error: '--auto-restart cannot be combined with --no-auto-restart.' });
  });

  it('applies the update to a configuration without mutating it', () => {
    const config: { schemaVersion: number; autoRestart?: AutoRestartConfig } = { schemaVersion: 1 };
    expect(applyAutoRestart(config, { kind: 'set' })).toEqual({ schemaVersion: 1, autoRestart: { maxConsecutiveRestarts: 2 } });
    expect(applyAutoRestart(config, { kind: 'set', maxConsecutiveRestarts: 3 })).toEqual({ schemaVersion: 1, autoRestart: { maxConsecutiveRestarts: 3 } });
    expect(applyAutoRestart({ ...config, autoRestart: CURRENT }, { kind: 'keep' })).toEqual({ schemaVersion: 1, autoRestart: CURRENT });
    expect(applyAutoRestart({ ...config, autoRestart: CURRENT }, { kind: 'remove' })).toEqual(config);
    expect(config).toEqual({ schemaVersion: 1 });
  });

  it('wants the feature when it is being set or already present and not removed', () => {
    expect(isAutoRestartWanted(undefined, { kind: 'set' })).toBe(true);
    expect(isAutoRestartWanted(CURRENT, { kind: 'keep' })).toBe(true);
    expect(isAutoRestartWanted(CURRENT, { kind: 'remove' })).toBe(false);
    expect(isAutoRestartWanted(undefined, { kind: 'keep' })).toBe(false);
  });
});

describe('mergeAutoRestart with a limit (prd-16 FR-09, TC-01)', () => {
  it('turns restart on with the limit (FR-09, TC-01)', () => {
    expect(mergeAutoRestart(undefined, { ...NO_FLAGS, autoRestart: true, maxRestarts: 3 })).toEqual({ update: { kind: 'set', maxConsecutiveRestarts: 3 } });
  });
  it('replaces the stored limit when restart is already on (FR-09, TC-01)', () => {
    expect(mergeAutoRestart(ON, { ...NO_FLAGS, maxRestarts: 5 })).toEqual({ update: { kind: 'set', maxConsecutiveRestarts: 5 } });
  });
  it('keeps the file when the limit is unchanged (FR-09, TC-01)', () => {
    expect(mergeAutoRestart(ON, { ...NO_FLAGS, maxRestarts: 2 })).toEqual({ update: { kind: 'keep' } });
  });
  it('refuses a limit while restart is off and not requested (FR-09, TC-01)', () => {
    expect(mergeAutoRestart(undefined, { ...NO_FLAGS, maxRestarts: 3 })).toEqual({ error: '--max-restarts needs restart to be on: add --auto-restart.' });
  });
});
