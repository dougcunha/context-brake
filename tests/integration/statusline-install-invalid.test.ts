import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStatuslineWorld, INSTALL, LOCAL_PATH, localStatusline, readWorldFile, removeStatuslineWorld, runJson, STATE_PATH, type InstallReportView, type StatuslineWorld } from '../helpers/statusline-world.js';

let world: StatuslineWorld;
function run(argv: readonly string[]): Promise<InstallReportView> { return runJson(world, argv); }
function read(path: string): Promise<string | null> { return readWorldFile(world, path); }
async function exists(path: string): Promise<boolean> { return (await read(path)) !== null; }

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

describe('status line bridge with unparseable settings (DEC-09, TC-14)', () => {
  it('reports a conflict and writes nothing when the local settings do not parse', async () => {
    await writeFile(join(world.root, LOCAL_PATH), '{ "statusLine": ', 'utf8');
    const report = await run(INSTALL);
    expect(report.findings.map((finding) => finding.code)).toContain('INVALID_HARNESS_CONFIG');
    expect(await read(LOCAL_PATH)).toBe('{ "statusLine": ');
    expect(await exists(STATE_PATH)).toBe(false);
  });

  it('writes no local settings when the project settings do not parse', async () => {
    await writeFile(join(world.root, '.claude', 'settings.json'), '{ broken', 'utf8');
    await run(INSTALL);
    expect(await exists(LOCAL_PATH)).toBe(false);
  });

  it('installs with a warning when the user settings do not parse', async () => {
    await mkdir(join(world.home, '.claude'), { recursive: true });
    await writeFile(join(world.home, '.claude', 'settings.json'), '{ broken', 'utf8');
    const report = await run(INSTALL);
    expect(report.findings.map((finding) => finding.code)).toContain('STATUSLINE_USER_SETTINGS_INVALID');
    expect(localStatusline(await read(LOCAL_PATH))['command']).not.toContain('--pipe');
  });
});
