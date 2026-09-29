import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STATUSLINE_OPT_OUT_FILE } from '../../src/infrastructure/harnesses/claude-code/statusline-default.js';
import { createStatuslineWorld, INSTALL, LOCAL_PATH, localStatusline, readWorldFile, removeStatuslineWorld, runJson, STATE_PATH, type StatuslineWorld } from '../helpers/statusline-world.js';

const PLAIN = ['init', '--yes', '--json'];
const OPT_OUT = [...PLAIN, '--no-statusline-bridge'];
let world: StatuslineWorld;
beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

async function exists(path: string): Promise<boolean> { return (await readWorldFile(world, path)) !== null; }

describe('status line bridge by default (prd-09 FR-04, DEC-08, TC-09)', () => {
  it('installs the bridge on a plain init and plans no change on the next one', async () => {
    expect((await runJson(world, PLAIN)).exitCode).toBe(0);
    expect(localStatusline(await readWorldFile(world, LOCAL_PATH))).toMatchObject({ type: 'command' });
    expect(await exists(STATE_PATH)).toBe(true);
    const installed = [await readWorldFile(world, LOCAL_PATH), await readWorldFile(world, STATE_PATH)];
    await runJson(world, PLAIN);
    expect([await readWorldFile(world, LOCAL_PATH), await readWorldFile(world, STATE_PATH)]).toEqual(installed);
  });
  it('keeps the bridge statusLine off in light mode', async () => {
    expect((await runJson(world, [...PLAIN, '--light'])).exitCode).toBe(0);
    expect(await exists(LOCAL_PATH)).toBe(false);
    expect(await exists(STATE_PATH)).toBe(false);
  });
});

describe('default bridge with unparseable local settings (prd-09 DEC-08, TC-09, codereview_01 CR-01)', () => {
  const MALFORMED = '{ "statusLine": ';
  beforeEach(async () => { await writeFile(join(world.root, LOCAL_PATH), MALFORMED); });
  it('warns instead of failing a plain init, installs the hooks, and leaves the file untouched', async () => {
    const report = await runJson(world, PLAIN);
    expect([report.exitCode, report.findings.map((finding) => finding.code)]).toEqual([1, ['STATUSLINE_SETTINGS_INVALID']]);
    expect(await readWorldFile(world, '.claude/settings.json')).toContain('context-brake');
    expect(await readWorldFile(world, LOCAL_PATH)).toBe(MALFORMED);
    expect(await exists(STATE_PATH)).toBe(false);
  });
  it('keeps the conflict when the bridge is requested explicitly', async () => {
    expect((await runJson(world, INSTALL)).exitCode).toBe(2);
    expect(await readWorldFile(world, LOCAL_PATH)).toBe(MALFORMED);
  });
});

describe('status line bridge opt-out memory (prd-09 FR-04, DEC-09, TC-09)', () => {
  it('remembers --no-statusline-bridge on later plain inits until --statusline-bridge', async () => {
    await runJson(world, PLAIN);
    expect((await runJson(world, OPT_OUT)).exitCode).toBe(0);
    expect(await exists(LOCAL_PATH)).toBe(false);
    expect(await exists(STATUSLINE_OPT_OUT_FILE)).toBe(true);
    await runJson(world, PLAIN);
    expect(await exists(LOCAL_PATH)).toBe(false);
    expect((await runJson(world, INSTALL)).exitCode).toBe(0);
    expect(await exists(LOCAL_PATH)).toBe(true);
    expect(await exists(STATUSLINE_OPT_OUT_FILE)).toBe(false);
  });
  it('forgets the opt-out on remove', async () => {
    await runJson(world, OPT_OUT);
    expect(await exists(STATUSLINE_OPT_OUT_FILE)).toBe(true);
    await runJson(world, ['remove', '--yes', '--json']);
    expect(await exists(STATUSLINE_OPT_OUT_FILE)).toBe(false);
  });
});
