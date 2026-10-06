import { describe, expect, it } from 'vitest';
import { CliArgumentError } from '../../src/cli/argument-validator.js';
import { parseInit } from '../../src/cli/init-arguments.js';
import { planConfigUpdates } from '../../src/cli/init-config-updates.js';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { SNAPSHOT_SECTION } from '../helpers/delegated-fixtures.js';

const LIGHT: ContextBrakeConfig = { ...DEFAULT_CONFIG, lightMode: { triggerZone: 'RED' } };
const LIGHT_WITH_DELEGATED: ContextBrakeConfig = { ...LIGHT, delegatedSnapshot: SNAPSHOT_SECTION };
const FULL: ContextBrakeConfig = { ...DEFAULT_CONFIG, fullMode: true };
function updates(config: ContextBrakeConfig | null, argv: string[]) { return planConfigUpdates(config, parseInit(argv)); }

describe('init light flags (TC-07, TC-11, TC-12, FR-07, FR-08, DEC-08)', () => {
  it('parses --light and --no-light', () => {
    expect(parseInit(['--light'])).toMatchObject({ light: true, noLight: false });
    expect(parseInit(['--no-light'])).toMatchObject({ light: false, noLight: true });
  });
  it('routes --snapshot-trigger to the light section when light mode is in effect', () => {
    expect(updates(LIGHT, ['--snapshot-trigger', 'YELLOW']).lightMode).toEqual({ kind: 'set', section: { triggerZone: 'YELLOW' } });
    expect(updates(null, ['--light', '--snapshot-trigger', 'YELLOW']).lightMode).toEqual({ kind: 'set', section: { triggerZone: 'YELLOW' } });
  });
  it('keeps the delegated section and removes it only on request', () => {
    expect(updates(LIGHT_WITH_DELEGATED, []).delegatedSnapshot).toEqual({ kind: 'keep' });
    expect(updates(LIGHT_WITH_DELEGATED, ['--no-delegated-snapshot']).delegatedSnapshot).toEqual({ kind: 'remove' });
  });
});

describe('init mode defaults (TC-11, TC-12, FR-07, FR-08, DEC-08)', () => {
  it('sets the section with the default trigger on --light', () => {
    expect(updates(null, ['--light'])).toEqual({ delegatedSnapshot: { kind: 'keep' }, lightMode: { kind: 'set', section: { triggerZone: 'RED' } }, debug: { kind: 'keep' }, autoRestart: { kind: 'keep' } });
  });
  it('sets the section on a plain run, with or without an existing configuration (FR-07)', () => {
    expect(updates(null, []).lightMode).toEqual({ kind: 'set', section: { triggerZone: 'RED' } });
    expect(updates(DEFAULT_CONFIG, []).lightMode).toEqual({ kind: 'set', section: { triggerZone: 'RED' } });
  });
  it('keeps full mode on a plain run once the choice is recorded (FR-08)', () => {
    expect(updates(FULL, []).lightMode).toEqual({ kind: 'keep' });
    expect(updates(FULL, ['--light']).lightMode).toEqual({ kind: 'set', section: { triggerZone: 'RED' } });
  });
  it('records the full choice on --no-light and routes the trigger back to the delegated section', () => {
    expect(updates(LIGHT_WITH_DELEGATED, ['--no-light', '--snapshot-trigger', 'YELLOW'])).toEqual({
      delegatedSnapshot: { kind: 'set', section: { ...SNAPSHOT_SECTION, triggerZone: 'YELLOW' } },
      lightMode: { kind: 'full' },
      debug: { kind: 'keep' },
      autoRestart: { kind: 'keep' },
    });
    expect(updates(DEFAULT_CONFIG, ['--no-light']).lightMode).toEqual({ kind: 'full' });
  });
  it('accepts --debug in light mode and keeps the debug key out of the light rejections (FR-06)', () => {
    expect(updates(LIGHT, ['--debug'])).toEqual({ delegatedSnapshot: { kind: 'keep' }, lightMode: { kind: 'keep' }, debug: { kind: 'set' }, autoRestart: { kind: 'keep' } });
    expect(updates({ ...LIGHT, debug: true }, [])).toEqual({ delegatedSnapshot: { kind: 'keep' }, lightMode: { kind: 'keep' }, debug: { kind: 'keep' }, autoRestart: { kind: 'keep' } });
  });
});

describe('init light option rejections (TC-07, FR-10)', () => {
  it.each([
    ['--snapshot-command', ['--snapshot-command', '/sdd-snapshot']],
    ['--snapshot-path', ['--snapshot-path', 'tasks/**/x.md']],
    ['--snapshot-skill', ['--snapshot-skill', 'save']],
    ['--resume-command', ['--resume-command', '/resume']],
    ['--create-instructions', ['--create-instructions']],
    ['--migrate-legacy', ['--migrate-legacy']],
    ['--instruction-file', ['--instruction-file', 'GEMINI.md']],
  ])('rejects %s with --light and with an existing light section', (option, argv) => {
    const message = `${option} is not available in the light mode. Remove the option, or leave the light mode with --no-light.`;
    expect(() => updates(null, ['--light', ...argv])).toThrow(new CliArgumentError(message));
    expect(() => updates(LIGHT, argv)).toThrow(new CliArgumentError(message));
  });
  it('accepts the same options once full mode is recorded (FR-08)', () => {
    expect(updates(FULL, ['--create-instructions']).lightMode).toEqual({ kind: 'keep' });
  });
  it('rejects --light with --no-light', () => {
    expect(() => updates(null, ['--light', '--no-light'])).toThrow(new CliArgumentError('--light cannot be combined with --no-light.'));
  });
  it('rejects an invalid trigger with the field path', () => {
    expect(() => updates(null, ['--light', '--snapshot-trigger', 'GREEN'])).toThrow(/lightMode\.triggerZone/);
  });
});
