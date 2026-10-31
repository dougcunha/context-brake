import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hookEvents, INIT, INIT_SHARED, LOCAL, LOCAL_USER_FILE, OWNED_EVENTS, readIn, REMOVE, SCRIPT, seedIn, SHARED, SHARED_USER_FILE, type HooksWorld } from '../helpers/claude-hooks-world.js';
import { createClaudeProject, removeProject, runCli } from '../helpers/delegated-world.js';
import { changedPaths, jsonReport, snapshotTree } from '../helpers/light-world.js';

let world: HooksWorld = { root: '' };
beforeEach(async () => { world = { root: await createClaudeProject('cb-hooks-mode-') }; });
afterEach(async () => { await removeProject(world.root); });

describe('init registers the Claude Code hooks by mode (gitIgnore, HOOKS_IN_VERSIONED_SETTINGS fix)', () => {
  it('writes the hooks to settings.local.json and none to settings.json when gitIgnore is on (default)', async () => {
    await seedIn(world, SHARED, SHARED_USER_FILE);
    expect((await runCli(world.root, INIT)).code).toBe(0);
    expect(await hookEvents(world, LOCAL)).toEqual(OWNED_EVENTS);
    expect(await readIn(world, SHARED)).toBe(SHARED_USER_FILE);
    expect(await readIn(world, SCRIPT)).not.toBeNull();
  });

  it('writes the hooks to settings.json and nothing to settings.local.json with --no-gitignore', async () => {
    await seedIn(world, SHARED, SHARED_USER_FILE);
    expect((await runCli(world.root, INIT_SHARED)).code).toBe(0);
    expect(await hookEvents(world, SHARED)).toEqual(OWNED_EVENTS);
    expect(await readIn(world, LOCAL)).toBeNull();
    expect(await readIn(world, SHARED)).toContain('// team settings');
  });

  it('plans nothing on a second init in either mode', async () => {
    for (const args of [INIT, INIT_SHARED]) {
      await runCli(world.root, args);
      const first = await snapshotTree(world.root);
      expect((await runCli(world.root, args)).code).toBe(0);
      expect(changedPaths(first, await snapshotTree(world.root))).toEqual([]);
    }
  });
});

describe('init composes with the status line and refuses unreadable files (default mode)', () => {
  it('keeps the user keys and holds the bridge and the hooks in the same local file, and remove gives it back', async () => {
    await seedIn(world, LOCAL, LOCAL_USER_FILE);
    expect((await runCli(world.root, ['init', '--yes', '--json'])).code).toBe(0);
    const local = (await readIn(world, LOCAL))!;
    expect([local.includes('// my overrides'), local.includes('"statusLine"')]).toEqual([true, true]);
    expect(await hookEvents(world, LOCAL)).toEqual(OWNED_EVENTS);
    expect((await runCli(world.root, REMOVE)).code).toBe(0);
    expect(await readIn(world, LOCAL)).toBe(LOCAL_USER_FILE);
  });

  it('refuses an unparseable settings.local.json and leaves it untouched', async () => {
    await seedIn(world, LOCAL, '{ "model": ');
    const report = jsonReport(await runCli(world.root, INIT));
    expect(report.findings.map((finding) => finding.code)).toContain('INVALID_HARNESS_CONFIG');
    expect([await readIn(world, LOCAL), await readIn(world, SHARED)]).toEqual(['{ "model": ', '{}\n']);
  });

  it('installs into settings.local.json even when settings.json does not parse, leaving that file untouched', async () => {
    await seedIn(world, SHARED, '{ broken');
    await runCli(world.root, INIT);
    expect(await hookEvents(world, LOCAL)).toEqual(OWNED_EVENTS);
    expect(await readIn(world, SHARED)).toBe('{ broken');
  });
});
