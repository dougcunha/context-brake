import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MOD_FILES, MOD_MARKETPLACE_NAME, MOD_PLUGIN_ID, MOD_ROOT } from '../../src/infrastructure/harnesses/claude-code/auto-restart-files.js';
import { MOD_OWNERSHIP_FILE } from '../../src/infrastructure/harnesses/claude-code/auto-restart-ownership.js';
import { readConfig } from '../helpers/delegated-world.js';
import { createStatuslineWorld, INSTALL, LOCAL_PATH, readWorldFile, removeStatuslineWorld, runJson, type StatuslineWorld } from '../helpers/statusline-world.js';

const INIT = ['init', '--yes', '--json'];
const OTHER_MARKETPLACE = { other: { source: { source: 'github', repo: 'acme/tools' } } };
const OTHER_PLUGINS = { 'tool@other': true };
let world: StatuslineWorld;

type Settings = { extraKnownMarketplaces?: Record<string, { source: { source: string; path: string } }>; enabledPlugins?: Record<string, boolean>; statusLine?: unknown };
type ChangeView = { readonly path: string; readonly kind: string };

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

async function localSettings(): Promise<Settings> {
  return JSON.parse((await readWorldFile(world, LOCAL_PATH)) ?? '{}') as Settings;
}

async function presentModFiles(): Promise<string[]> {
  const found = await Promise.all(MOD_FILES.map(async (path) => ((await readWorldFile(world, path)) === null ? undefined : path)));
  return found.filter((path): path is string => path !== undefined);
}

describe('install through init --auto-restart (FR-07, DEC-08, TC-17)', () => {
  it('writes the marketplace, the plugin files, the two settings keys and the config block', async () => {
    const report = await runJson(world, [...INIT, '--auto-restart']);
    expect(report.exitCode).toBe(0);
    expect(await presentModFiles()).toEqual([...MOD_FILES]);
    const settings = await localSettings();
    expect(settings.extraKnownMarketplaces?.[MOD_MARKETPLACE_NAME]?.source).toEqual({ source: 'directory', path: join(world.root, MOD_ROOT) });
    expect(settings.enabledPlugins?.[MOD_PLUGIN_ID]).toBe(true);
    expect((await readConfig(world.root)).autoRestart).toEqual({ maxConsecutiveRestarts: 2 });
  });

  it('plans nothing on the second run and keeps the status line bridge', async () => {
    await runJson(world, [...INIT, '--auto-restart']);
    const before = await readWorldFile(world, LOCAL_PATH);
    const second = await runJson(world, INIT);
    expect(second.plan.changes.map((change) => change.path).filter((path) => MOD_FILES.includes(path) || path === LOCAL_PATH)).toEqual([]);
    expect(await readWorldFile(world, LOCAL_PATH)).toBe(before);
    expect(JSON.parse(before ?? '{}')).toHaveProperty('statusLine');
  });
});

describe('plain init adds nothing (FR-07, NFR-05, TC-18)', () => {
  it('leaves the mod files, the settings keys and the config block out', async () => {
    await runJson(world, INIT);
    expect(await presentModFiles()).toEqual([]);
    expect((await localSettings()).extraKnownMarketplaces).toBeUndefined();
    expect((await readConfig(world.root)).autoRestart).toBeUndefined();
  });
});

describe('existing user entries survive (FR-07, TC-20)', () => {
  it('keeps the other marketplaces and plugins through install and removal', async () => {
    await runJson(world, INIT);
    const seeded = { ...(await localSettings()), extraKnownMarketplaces: OTHER_MARKETPLACE, enabledPlugins: OTHER_PLUGINS };
    await (await import('node:fs/promises')).writeFile(join(world.root, LOCAL_PATH), `${JSON.stringify(seeded, null, 2)}\n`, 'utf8');
    await runJson(world, [...INIT, '--auto-restart']);
    expect(Object.keys((await localSettings()).extraKnownMarketplaces ?? {}).sort()).toEqual([MOD_MARKETPLACE_NAME, 'other']);
    await runJson(world, [...INIT, '--no-auto-restart']);
    expect((await localSettings()).extraKnownMarketplaces).toEqual(OTHER_MARKETPLACE);
    expect((await localSettings()).enabledPlugins).toEqual(OTHER_PLUGINS);
  });
});

describe('status line opt-out that deletes the bridge-created local settings (FR-07, DEC-08, CR-01)', () => {
  it('updates the file with the two loader keys instead of deleting it, and plans nothing on the next run', async () => {
    await runJson(world, INSTALL);
    const report = await runJson(world, [...INIT, '--auto-restart', '--no-statusline-bridge']);
    const local = (report.plan.changes as readonly ChangeView[]).filter((change) => change.path === LOCAL_PATH);
    expect(local.map((change) => change.kind)).toEqual(['update']);
    const settings = await localSettings();
    expect(settings.enabledPlugins?.[MOD_PLUGIN_ID]).toBe(true);
    expect(settings.extraKnownMarketplaces?.[MOD_MARKETPLACE_NAME]).toBeDefined();
    expect(settings.statusLine).toBeUndefined();
    const again = await runJson(world, INIT);
    expect(again.plan.changes.map((change) => change.path).filter((path) => MOD_FILES.includes(path) || path === LOCAL_PATH)).toEqual([]);
  });
});

describe('switch-off removes the local settings the install created (FR-09, FR-07, codereview_02 CR-01)', () => {
  it.each([
    ['remove', ['remove', '--yes', '--json']],
    ['opt-out of both', [...INIT, '--no-auto-restart', '--no-statusline-bridge']],
  ])('leaves no local settings file after %s', async (_name, argv) => {
    expect(await readWorldFile(world, LOCAL_PATH)).toBeNull();
    await runJson(world, [...INIT, '--auto-restart']);
    await runJson(world, argv);
    expect(await readWorldFile(world, LOCAL_PATH)).toBeNull();
    expect(await readWorldFile(world, MOD_OWNERSHIP_FILE)).toBeNull();
  });
});
