import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runnerReporting } from '../helpers/claude-version-runner.js';
import { BRIDGE_PATH, createStatuslineWorld, INSTALL, LOCAL_PATH, localStatusline, readWorldFile, removeStatuslineWorld, runJson, STATE_PATH, type StatuslineWorld } from '../helpers/statusline-world.js';

const USER_LOCAL = '{\n  "statusLine": { "type": "command", "command": "personal.sh", "padding": 2 }\n}\n';
const PLAIN = ['init', '--yes', '--json'];
const OLD = { runner: runnerReporting('2.1.286') };
const COMPATIBLE = { runner: runnerReporting('2.1.296') };
let world: StatuslineWorld;

async function exists(path: string): Promise<boolean> { return (await readWorldFile(world, path)) !== null; }

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

describe('migration of an installed bridge to the mod (FR-06, OBJ-03, D-05, TC-08)', () => {
  it('restores the user status line, removes the bridge, and installs the mod', async () => {
    await writeFile(join(world.root, LOCAL_PATH), USER_LOCAL, 'utf8');
    await runJson(world, PLAIN, OLD);
    expect(await exists(STATE_PATH)).toBe(true);
    expect(localStatusline(await readWorldFile(world, LOCAL_PATH))).not.toMatchObject({ command: 'personal.sh' });
    expect((await runJson(world, PLAIN, COMPATIBLE)).exitCode).toBe(0);
    expect(localStatusline(await readWorldFile(world, LOCAL_PATH))).toEqual({ type: 'command', command: 'personal.sh', padding: 2 });
    expect([await exists(BRIDGE_PATH), await exists(STATE_PATH)]).toEqual([false, false]);
    expect(await readWorldFile(world, LOCAL_PATH)).toContain('context-brake-restart@context-brake-local');
  });

  it('leaves no status line in a local file the bridge created', async () => {
    await runJson(world, PLAIN, OLD);
    await runJson(world, PLAIN, COMPATIBLE);
    const local = await readWorldFile(world, LOCAL_PATH);
    expect(local).not.toContain('statusLine');
    expect(local).toContain('context-brake-restart@context-brake-local');
  });

  it('prints in --dry-run the paths the real run changes and writes nothing', async () => {
    await writeFile(join(world.root, LOCAL_PATH), USER_LOCAL, 'utf8');
    await runJson(world, PLAIN, OLD);
    const before = [await readWorldFile(world, LOCAL_PATH), await exists(STATE_PATH)];
    const dryRun = await runJson(world, [...PLAIN, '--dry-run'], COMPATIBLE);
    expect([await readWorldFile(world, LOCAL_PATH), await exists(STATE_PATH)]).toEqual(before);
    const applied = await runJson(world, PLAIN, COMPATIBLE);
    expect(dryRun.plan.changes).toEqual(applied.plan.changes);
  });

});

describe('migration choices (FR-05, FR-06)', () => {
  it('keeps the bridge when the user asks for it', async () => {
    await runJson(world, PLAIN, OLD);
    await runJson(world, INSTALL, COMPATIBLE);
    expect([await exists(BRIDGE_PATH), await exists(STATE_PATH)]).toEqual([true, true]);
  });
});
