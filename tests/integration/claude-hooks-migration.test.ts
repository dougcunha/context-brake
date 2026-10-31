import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hookEvents, INIT, INIT_SHARED, LOCAL, LOCAL_USER_FILE, OWNED_EVENTS, readIn, seedIn, SHARED, SHARED_USER_FILE, type HooksWorld } from '../helpers/claude-hooks-world.js';
import { createClaudeProject, removeProject, runCli } from '../helpers/delegated-world.js';
import { changedPaths, snapshotTree } from '../helpers/light-world.js';

let world: HooksWorld = { root: '' };
beforeEach(async () => { world = { root: await createClaudeProject('cb-hooks-migrate-') }; });
afterEach(async () => { await removeProject(world.root); });

async function rerunChangesNothing(args: readonly string[]): Promise<void> {
  const before = await snapshotTree(world.root);
  expect((await runCli(world.root, args)).code).toBe(0);
  expect(changedPaths(before, await snapshotTree(world.root))).toEqual([]);
}

describe('init migrates settings.json to settings.local.json (default mode, legacy install)', () => {
  it('moves the hooks and keeps the other settings byte for byte, then plans nothing', async () => {
    await seedIn(world, SHARED, SHARED_USER_FILE);
    await runCli(world.root, INIT_SHARED);
    await rm(join(world.root, 'context-brake.config.json'));
    expect(await hookEvents(world, SHARED)).toEqual(OWNED_EVENTS);
    expect((await runCli(world.root, INIT)).code).toBe(0);
    expect(await hookEvents(world, SHARED)).toEqual([]);
    expect(await hookEvents(world, LOCAL)).toEqual(OWNED_EVENTS);
    expect(await readIn(world, SHARED)).toBe(SHARED_USER_FILE);
    await rerunChangesNothing(INIT);
  });

  it('deletes a settings.json that the ContextBrake created when the migration leaves it empty', async () => {
    await rm(join(world.root, SHARED));
    await runCli(world.root, INIT_SHARED);
    expect(await readIn(world, SHARED)).not.toBeNull();
    await rm(join(world.root, 'context-brake.config.json'));
    expect((await runCli(world.root, INIT)).code).toBe(0);
    expect(await hookEvents(world, LOCAL)).toEqual(OWNED_EVENTS);
    expect(await readIn(world, SHARED)).toBeNull();
  });
});

describe('init migrates settings.local.json to settings.json (--no-gitignore)', () => {
  it('moves the hooks and keeps the user keys byte for byte, then plans nothing', async () => {
    await seedIn(world, LOCAL, LOCAL_USER_FILE);
    await seedIn(world, SHARED, SHARED_USER_FILE);
    await runCli(world.root, INIT);
    expect(await hookEvents(world, LOCAL)).toEqual(OWNED_EVENTS);
    expect((await runCli(world.root, INIT_SHARED)).code).toBe(0);
    expect(await hookEvents(world, LOCAL)).toEqual([]);
    expect(await hookEvents(world, SHARED)).toEqual(OWNED_EVENTS);
    expect(await readIn(world, LOCAL)).toBe(LOCAL_USER_FILE);
    await rerunChangesNothing(INIT_SHARED);
  });

  it('deletes the settings.local.json that init created when the move leaves it empty', async () => {
    await runCli(world.root, INIT);
    expect(await readIn(world, LOCAL)).not.toBeNull();
    expect((await runCli(world.root, INIT_SHARED)).code).toBe(0);
    expect(await hookEvents(world, SHARED)).toEqual(OWNED_EVENTS);
    expect(await readIn(world, LOCAL)).toBeNull();
  });

  it('keeps a settings.local.json that the user created when the move leaves it without keys', async () => {
    await seedIn(world, LOCAL, '{}\n');
    await runCli(world.root, INIT);
    expect((await runCli(world.root, INIT_SHARED)).code).toBe(0);
    expect(await hookEvents(world, SHARED)).toEqual(OWNED_EVENTS);
    expect(await readIn(world, LOCAL)).toBe('{}\n');
  });
});
