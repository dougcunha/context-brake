import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BRIDGE_PATH, createStatuslineWorld, INSTALL, LOCAL_PATH, localStatusline, readWorldFile, removeStatuslineWorld, runJson, STATE_PATH, type StatuslineWorld } from '../helpers/statusline-world.js';
import { runnerReporting } from '../helpers/claude-version-runner.js';

const USER_LOCAL = '{\n  "permissions": { "allow": ["Bash(ls)"] },\n  "statusLine": { "type": "command", "command": "personal.sh", "padding": 2 }\n}\n';
const MOD_MODULE = '.context-brake/claude-mod/context-brake-restart/hooks/register.mjs';
const PLAIN = ['init', '--yes', '--json'];
const COMPATIBLE = { runner: runnerReporting('2.1.296') };
let world: StatuslineWorld;

async function exists(path: string): Promise<boolean> { return (await readWorldFile(world, path)) !== null; }

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

describe('init in mod-first mode (FR-04, FR-05, D-04, TC-06, TC-07)', () => {
  it('installs the mod, leaves the status line alone, writes no restart config, and plans nothing on a second run', async () => {
    await writeFile(join(world.root, LOCAL_PATH), USER_LOCAL, 'utf8');
    expect((await runJson(world, PLAIN, COMPATIBLE)).exitCode).toBe(0);
    expect(localStatusline(await readWorldFile(world, LOCAL_PATH))).toEqual({ type: 'command', command: 'personal.sh', padding: 2 });
    expect([await exists(BRIDGE_PATH), await exists(STATE_PATH), await exists(MOD_MODULE)]).toEqual([false, false, true]);
    expect(await readWorldFile(world, 'context-brake.config.json')).not.toContain('autoRestart');
    const installed = await readWorldFile(world, LOCAL_PATH);
    const second = await runJson(world, PLAIN, COMPATIBLE);
    expect(second.plan.changes).toEqual([]);
    expect(await readWorldFile(world, LOCAL_PATH)).toBe(installed);
  });

  it('installs the bridge when the user asks for it, whatever the version', async () => {
    await runJson(world, INSTALL, COMPATIBLE);
    expect([await exists(BRIDGE_PATH), await exists(STATE_PATH)]).toEqual([true, true]);
  });

  it('records the opt-out and still installs the mod with --no-statusline-bridge', async () => {
    await runJson(world, [...PLAIN, '--no-statusline-bridge'], COMPATIBLE);
    expect([await exists(BRIDGE_PATH), await exists('.context-brake/runtime/claude-statusline-opt-out.json'), await exists(MOD_MODULE)]).toEqual([false, true, true]);
  });
});

describe('remove after a mod-first init (FR-08, TC-10)', () => {
  it('returns a user local settings file to its original bytes', async () => {
    await mkdir(join(world.root, '.claude'), { recursive: true });
    await writeFile(join(world.root, LOCAL_PATH), USER_LOCAL, 'utf8');
    await runJson(world, PLAIN, COMPATIBLE);
    await runJson(world, ['remove', '--yes', '--json'], COMPATIBLE);
    expect(await readFile(join(world.root, LOCAL_PATH), 'utf8')).toBe(USER_LOCAL);
    expect(await exists(MOD_MODULE)).toBe(false);
  });

  it('deletes the local settings file the install created', async () => {
    await runJson(world, PLAIN, COMPATIBLE);
    expect(await exists(LOCAL_PATH)).toBe(true);
    await runJson(world, ['remove', '--yes', '--json'], COMPATIBLE);
    expect(await exists(LOCAL_PATH)).toBe(false);
  });
});
