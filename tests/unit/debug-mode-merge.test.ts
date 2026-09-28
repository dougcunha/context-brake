import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { applyDebugMode, isDebugModeInEffect, mergeDebugMode, type DebugModeFlags } from '../../src/core/services/debug-mode-merge.js';

const NO_FLAGS: DebugModeFlags = { debug: false, noDebug: false };
const DEBUG: DebugModeFlags = { debug: true, noDebug: false };
const NO_DEBUG: DebugModeFlags = { debug: false, noDebug: true };

describe('debug mode merge (TC-01, FR-01, FR-04, DEC-02)', () => {
  it('sets the mode with --debug when it is off', () => {
    expect(mergeDebugMode(undefined, DEBUG)).toEqual({ update: { kind: 'set' } });
    expect(mergeDebugMode(false, DEBUG)).toEqual({ update: { kind: 'set' } });
  });
  it.each([
    ['no flag and no key', undefined, NO_FLAGS],
    ['no flag with the mode on', true, NO_FLAGS],
    ['--debug with the mode on', true, DEBUG],
    ['--no-debug without the key', undefined, NO_DEBUG],
  ])('keeps the configuration for %s', (_, current, flags) => {
    expect(mergeDebugMode(current, flags)).toEqual({ update: { kind: 'keep' } });
  });
  it.each([true, false])('removes an existing key (%s) with --no-debug', (current) => {
    expect(mergeDebugMode(current, NO_DEBUG)).toEqual({ update: { kind: 'remove' } });
  });
  it('rejects --debug together with --no-debug', () => {
    expect(mergeDebugMode(undefined, { debug: true, noDebug: true })).toEqual({ error: '--debug cannot be combined with --no-debug.' });
  });
});

describe('debug mode apply and effect (TC-01, FR-01, FR-04, FR-05, DEC-02)', () => {
  it('writes debug true on set and drops the key on remove', () => {
    const on = applyDebugMode(DEFAULT_CONFIG, { kind: 'set' });
    expect(on.debug).toBe(true);
    expect('debug' in applyDebugMode(on, { kind: 'remove' })).toBe(false);
  });
  it('returns the same object on keep', () => {
    expect(applyDebugMode(DEFAULT_CONFIG, { kind: 'keep' })).toBe(DEFAULT_CONFIG);
  });
  it.each([
    ['debug true', { ...DEFAULT_CONFIG, debug: true }, true],
    ['debug false', { ...DEFAULT_CONFIG, debug: false }, false],
    ['no key', DEFAULT_CONFIG, false],
    ['debug true in light mode', { ...DEFAULT_CONFIG, debug: true, lightMode: { triggerZone: 'RED' as const } }, false],
    ['no config', null, false],
  ])('is in effect for %s: %s', (_, config, expected) => {
    expect(isDebugModeInEffect(config)).toBe(expected);
  });
});
