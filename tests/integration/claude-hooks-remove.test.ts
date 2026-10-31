import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hookEvents, INIT, LOCAL, LOCAL_USER_FILE, OWNED_EVENTS, readIn, REMOVE, SCRIPT, seedIn, SHARED, SHARED_USER_FILE, type HooksWorld } from '../helpers/claude-hooks-world.js';
import { createClaudeProject, removeProject, runCli } from '../helpers/delegated-world.js';

let world: HooksWorld = { root: '' };
beforeEach(async () => { world = { root: await createClaudeProject('cb-hooks-remove-') }; });
afterEach(async () => { await removeProject(world.root); });

describe('remove cleans both Claude Code settings files', () => {
  it('removes the hooks from settings.json and settings.local.json and keeps everything else', async () => {
    await seedIn(world, LOCAL, LOCAL_USER_FILE);
    await runCli(world.root, INIT);
    const local = JSON.parse(((await readIn(world, LOCAL))!).replace(/^\s*\/\/.*$/gm, '')) as { hooks: Record<string, unknown> };
    await seedIn(world, SHARED, `${JSON.stringify({ permissions: { allow: ['Bash(ls)'] }, hooks: local.hooks }, null, 2)}\n`);
    expect([await hookEvents(world, SHARED), await hookEvents(world, LOCAL)]).toEqual([OWNED_EVENTS, OWNED_EVENTS]);
    expect((await runCli(world.root, REMOVE)).code).toBe(0);
    expect([await hookEvents(world, SHARED), await hookEvents(world, LOCAL)]).toEqual([[], []]);
    expect(await readIn(world, LOCAL)).toBe(LOCAL_USER_FILE);
    expect(JSON.parse((await readIn(world, SHARED))!)).toEqual({ permissions: { allow: ['Bash(ls)'] }, hooks: {} });
    expect(await readIn(world, SCRIPT)).toBeNull();
  });

  it('deletes the settings.local.json that init created and gives settings.json back as it was', async () => {
    await seedIn(world, SHARED, SHARED_USER_FILE);
    await runCli(world.root, INIT);
    expect((await runCli(world.root, REMOVE)).code).toBe(0);
    expect(await readIn(world, LOCAL)).toBeNull();
    expect(await readIn(world, SHARED)).toBe(SHARED_USER_FILE);
  });
});
