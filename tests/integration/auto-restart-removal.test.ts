import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MOD_FILES, MOD_MODULE_FILE } from '../../src/infrastructure/harnesses/claude-code/auto-restart-files.js';
import { readConfig } from '../helpers/delegated-world.js';
import { createStatuslineWorld, LOCAL_PATH, readWorldFile, removeStatuslineWorld, runJson, type StatuslineWorld } from '../helpers/statusline-world.js';

const INIT = ['init', '--yes', '--json'];
const EDITED = '// edited by the user\n';
let world: StatuslineWorld;

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

async function presentModFiles(): Promise<string[]> {
  const found = await Promise.all(MOD_FILES.map(async (path) => ((await readWorldFile(world, path)) === null ? undefined : path)));
  return found.filter((path): path is string => path !== undefined);
}

async function hasModKeys(): Promise<boolean> {
  const text = await readWorldFile(world, LOCAL_PATH);
  return text !== null && /context-brake-restart|context-brake-local/.test(text);
}

describe('switching off with init --no-auto-restart (FR-07, FR-09, TC-19)', () => {
  it('deletes the other mod files, the settings keys and the config block, and keeps an edited mod file and says so', async () => {
    await runJson(world, [...INIT, '--auto-restart']);
    await writeFile(join(world.root, MOD_MODULE_FILE), EDITED, 'utf8');
    const report = await runJson(world, [...INIT, '--no-auto-restart']);
    expect(await presentModFiles()).toEqual([MOD_MODULE_FILE]);
    expect(await readWorldFile(world, MOD_MODULE_FILE)).toBe(EDITED);
    expect(report.findings.map((finding) => finding.code).join(' ')).toMatch(/MODIFIED/);
    expect(await hasModKeys()).toBe(false);
    expect((await readConfig(world.root)).autoRestart).toBeUndefined();
  });
});

describe('remove keeps what the user edited (FR-09, TC-19)', () => {
  it('keeps a mod file the user edited and reports it', async () => {
    await runJson(world, [...INIT, '--auto-restart']);
    await writeFile(join(world.root, MOD_MODULE_FILE), EDITED, 'utf8');
    const report = await runJson(world, ['remove', '--yes', '--json']);
    expect(await readWorldFile(world, MOD_MODULE_FILE)).toBe(EDITED);
    expect(report.findings.map((finding) => finding.code).join(' ')).toMatch(/MODIFIED/);
  });
});
