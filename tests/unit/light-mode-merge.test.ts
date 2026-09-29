import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { applyLightMode, isLightModeInEffect, mergeLightMode, type LightModeFlags, type LightModeSource } from '../../src/core/services/light-mode-merge.js';

const NO_FLAGS: LightModeFlags = { light: false, noLight: false };
const LIGHT: LightModeFlags = { light: true, noLight: false };
const NO_LIGHT: LightModeFlags = { light: false, noLight: true };
const RED_SECTION = { triggerZone: 'RED' } as const;
const LIGHT_INSTALL = { lightMode: RED_SECTION } as const;
const FULL_INSTALL = { fullMode: true } as const;

describe('light mode merge with the light default (FR-07, FR-08, DEC-08, TC-11, TC-12)', () => {
  it.each([
    { name: 'a new repository without flags', config: undefined, flags: NO_FLAGS, expected: { kind: 'set', section: RED_SECTION } },
    { name: 'a full install that never chose', config: { telemetry: {} } as LightModeSource, flags: NO_FLAGS, expected: { kind: 'set', section: RED_SECTION } },
    { name: 'an existing light section', config: LIGHT_INSTALL, flags: NO_FLAGS, expected: { kind: 'keep' } },
    { name: 'a recorded full choice', config: FULL_INSTALL, flags: NO_FLAGS, expected: { kind: 'keep' } },
    { name: 'a recorded full choice with --light', config: FULL_INSTALL, flags: LIGHT, expected: { kind: 'set', section: RED_SECTION } },
    { name: 'no configuration with --no-light', config: undefined, flags: NO_LIGHT, expected: { kind: 'full' } },
    { name: 'a light section with --no-light', config: LIGHT_INSTALL, flags: NO_LIGHT, expected: { kind: 'full' } },
    { name: 'a recorded full choice with --no-light', config: FULL_INSTALL, flags: NO_LIGHT, expected: { kind: 'keep' } },
    { name: 'a trigger without a section', config: undefined, flags: { ...NO_FLAGS, triggerZone: 'YELLOW' }, expected: { kind: 'set', section: { triggerZone: 'YELLOW' } } },
    { name: 'a trigger on an existing section', config: LIGHT_INSTALL, flags: { ...NO_FLAGS, triggerZone: 'YELLOW' }, expected: { kind: 'set', section: { triggerZone: 'YELLOW' } } },
  ])('resolves $name', ({ config, flags, expected }) => {
    expect(mergeLightMode(config, flags)).toEqual({ update: expected });
  });
});

describe('light mode merge errors (FR-08, TC-12)', () => {
  it('rejects --light with --no-light', () => {
    expect(mergeLightMode(undefined, { light: true, noLight: true })).toEqual({ error: '--light cannot be combined with --no-light.' });
  });
  it('rejects an invalid trigger with the field path', () => {
    const merge = mergeLightMode(undefined, { ...LIGHT, triggerZone: 'GREEN' });
    expect('error' in merge && merge.error.startsWith('Invalid light mode option: lightMode.triggerZone')).toBe(true);
  });
});

describe('light mode in effect (FR-07, FR-08, DEC-08, TC-12)', () => {
  it('is on unless a full choice was recorded or --no-light was given', () => {
    expect(isLightModeInEffect(undefined, LIGHT)).toBe(true);
    expect(isLightModeInEffect(undefined, NO_FLAGS)).toBe(true);
    expect(isLightModeInEffect(LIGHT_INSTALL, NO_FLAGS)).toBe(true);
    expect(isLightModeInEffect(FULL_INSTALL, NO_FLAGS)).toBe(false);
    expect(isLightModeInEffect(FULL_INSTALL, LIGHT)).toBe(true);
    expect(isLightModeInEffect(LIGHT_INSTALL, NO_LIGHT)).toBe(false);
    expect(isLightModeInEffect(undefined, NO_LIGHT)).toBe(false);
  });
});

describe('light mode application (FR-08, NFR-03, TC-12)', () => {
  it('writes one key at a time and keeps every other field in order', () => {
    const light = applyLightMode(DEFAULT_CONFIG, { kind: 'set', section: RED_SECTION });
    expect(light.lightMode).toEqual(RED_SECTION);
    const full = applyLightMode(light, { kind: 'full' });
    expect(JSON.stringify(full)).toBe(JSON.stringify({ ...DEFAULT_CONFIG, fullMode: true }));
    expect(applyLightMode(full, { kind: 'set', section: RED_SECTION }).fullMode).toBeUndefined();
  });
  it('returns the same object when keeping', () => {
    expect(applyLightMode(DEFAULT_CONFIG, { kind: 'keep' })).toBe(DEFAULT_CONFIG);
  });
});
