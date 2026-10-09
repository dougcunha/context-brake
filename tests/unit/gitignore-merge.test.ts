import { describe, expect, it } from 'vitest';
import { hasConfigurationFlag, parseInit } from '../../src/cli/init-arguments.js';
import { planConfigUpdates } from '../../src/cli/init-config-updates.js';
import { configurationSchema, DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { planConfigChange } from '../../src/core/services/installation-builder.js';
import { applyGitIgnore, isGitIgnoreEnabled, mergeGitIgnore } from '../../src/core/services/gitignore-merge.js';

const NO_FLAGS = { gitignore: false, noGitignore: false };

describe('mergeGitIgnore (prd-17 FR-05, TC-03)', () => {
  it.each([
    [undefined, { gitignore: false, noGitignore: true }, 'set'],
    [false, { gitignore: false, noGitignore: true }, 'keep'],
    [false, { gitignore: true, noGitignore: false }, 'remove'],
    [undefined, { gitignore: true, noGitignore: false }, 'keep'],
    [false, NO_FLAGS, 'keep'],
    [undefined, NO_FLAGS, 'keep'],
  ] as const)('stored %s with %j gives %s (FR-05, TC-03)', (current, flags, kind) => {
    expect(mergeGitIgnore(current, flags)).toEqual({ update: { kind } });
  });
  it('rejects both flags together, naming both (FR-05, TC-03)', () => {
    expect(mergeGitIgnore(undefined, { gitignore: true, noGitignore: true })).toEqual({ error: '--gitignore cannot be combined with --no-gitignore.' });
  });
  it('stores false only, drops the key to turn it on, and defaults to enabled (FR-05, TC-03)', () => {
    const off = applyGitIgnore({ a: 1 } as { a: number; gitIgnore?: boolean }, { kind: 'set' });
    expect(off).toEqual({ a: 1, gitIgnore: false });
    expect(applyGitIgnore(off, { kind: 'remove' })).toEqual({ a: 1 });
    expect(applyGitIgnore(off, { kind: 'keep' })).toBe(off);
    expect([isGitIgnoreEnabled(null), isGitIgnoreEnabled({}), isGitIgnoreEnabled({ gitIgnore: false })]).toEqual([true, true, false]);
  });
});

describe('--gitignore and --no-gitignore reach the configuration (prd-17 FR-05, NFR-02, TC-03)', () => {
  it('parses both flags and rejects them together with exit-64 wording (FR-05, TC-03)', () => {
    expect(parseInit(['--no-gitignore'])).toMatchObject({ noGitignore: true, gitignore: false });
    expect(parseInit(['--gitignore'])).toMatchObject({ gitignore: true, noGitignore: false });
    expect(() => parseInit(['--gitignore', '--no-gitignore'])).toThrow('--gitignore cannot be combined with --no-gitignore.');
  });
  it('counts both flags as configuration flags so the assistant stays away (FR-05, TC-03)', () => {
    expect(hasConfigurationFlag(parseInit(['--no-gitignore']))).toBe(true);
    expect(hasConfigurationFlag(parseInit(['--gitignore']))).toBe(true);
    expect(hasConfigurationFlag(parseInit(['--dry-run']))).toBe(false);
  });
  it('writes gitIgnore: false only when off, after debug, and validates against the schema (FR-05, TC-03)', () => {
    const base = { ...DEFAULT_CONFIG, debug: true };
    const off = planConfigUpdates(base, parseInit(['--no-gitignore']));
    const written = planConfigChange({ root: '/project', current: base, active: ['claude-code'], gitIgnore: off.gitIgnore });
    expect(Object.keys(written.config).slice(-3)).toEqual(['snapshot', 'debug', 'gitIgnore']);
    expect(written.config.gitIgnore).toBe(false);
    expect(written.change.preview.summary).toContain('stop listing ContextBrake files in .gitignore');
    expect(configurationSchema.safeParse(written.config).success).toBe(true);
    const back = planConfigChange({ root: '/project', current: written.config, active: ['claude-code'], gitIgnore: planConfigUpdates(written.config, parseInit(['--gitignore'])).gitIgnore });
    expect(back.config).not.toHaveProperty('gitIgnore');
    expect(back.change.preview.summary).toContain('list ContextBrake files in .gitignore');
  });
});
