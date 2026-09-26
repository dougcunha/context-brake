import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { applyLightMode, isLightModeInEffect, mergeLightMode, type LightModeFlags } from '../../src/core/services/light-mode-merge.js';

const NO_FLAGS: LightModeFlags = { light: false, noLight: false };
const LIGHT: LightModeFlags = { light: true, noLight: false };
const RED_SECTION = { triggerZone: 'RED' } as const;

describe('light mode merge (TC-06, FR-01, FR-04, DEC-07)', () => {
  it('creates the section with the default trigger', () => {
    expect(mergeLightMode(undefined, LIGHT)).toEqual({ update: { kind: 'set', section: RED_SECTION } });
  });
  it('creates the section with the given trigger', () => {
    expect(mergeLightMode(undefined, { ...LIGHT, triggerZone: 'YELLOW' })).toEqual({ update: { kind: 'set', section: { triggerZone: 'YELLOW' } } });
  });
  it('updates the trigger of an existing section without --light', () => {
    expect(mergeLightMode(RED_SECTION, { ...NO_FLAGS, triggerZone: 'YELLOW' })).toEqual({ update: { kind: 'set', section: { triggerZone: 'YELLOW' } } });
  });
  it.each([
    ['no flag and no section', undefined, NO_FLAGS],
    ['no flag on an existing section', RED_SECTION, NO_FLAGS],
    ['--light on an existing section', RED_SECTION, LIGHT],
    ['--no-light without a section', undefined, { light: false, noLight: true }],
    ['a trigger without light mode', undefined, { ...NO_FLAGS, triggerZone: 'YELLOW' }],
  ])('keeps the configuration for %s', (_, current, flags) => {
    expect(mergeLightMode(current, flags)).toEqual({ update: { kind: 'keep' } });
  });
  it('removes an existing section with --no-light', () => {
    expect(mergeLightMode(RED_SECTION, { light: false, noLight: true })).toEqual({ update: { kind: 'remove' } });
  });
});

describe('light mode merge errors (TC-06, FR-10)', () => {
  it('rejects --light with --no-light', () => {
    expect(mergeLightMode(undefined, { light: true, noLight: true })).toEqual({ error: '--light cannot be combined with --no-light.' });
  });
  it('rejects an invalid trigger with the field path', () => {
    const merge = mergeLightMode(undefined, { ...LIGHT, triggerZone: 'GREEN' });
    expect('error' in merge && merge.error.startsWith('Invalid light mode option: lightMode.triggerZone')).toBe(true);
  });
});

describe('light mode application (TC-06, NFR-01)', () => {
  it('reports light mode in effect for --light or an existing section without --no-light', () => {
    expect(isLightModeInEffect(undefined, LIGHT)).toBe(true);
    expect(isLightModeInEffect(RED_SECTION, NO_FLAGS)).toBe(true);
    expect(isLightModeInEffect(RED_SECTION, { light: false, noLight: true })).toBe(false);
    expect(isLightModeInEffect(undefined, NO_FLAGS)).toBe(false);
  });
  it('adds and removes the key while keeping every other field in order', () => {
    const added = applyLightMode(DEFAULT_CONFIG, { kind: 'set', section: RED_SECTION });
    expect(added.lightMode).toEqual(RED_SECTION);
    expect(JSON.stringify(applyLightMode(added, { kind: 'remove' }))).toBe(JSON.stringify(DEFAULT_CONFIG));
  });
  it('returns the same object when keeping', () => {
    expect(applyLightMode(DEFAULT_CONFIG, { kind: 'keep' })).toBe(DEFAULT_CONFIG);
  });
});
