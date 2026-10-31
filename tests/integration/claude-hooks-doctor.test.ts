import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOOKS_IN_VERSIONED_SETTINGS } from '../../src/infrastructure/harnesses/claude-code/hooks-diagnostics.js';
import { doctorCodes, doctorFindings, hookEvents, INIT, INIT_SHARED, LOCAL, OWNED_EVENTS, readIn, REMOVE, SCRIPT, seedIn, SHARED, type HooksWorld } from '../helpers/claude-hooks-world.js';
import { createClaudeProject, removeProject, runCli } from '../helpers/delegated-world.js';

let world: HooksWorld = { root: '' };
beforeEach(async () => { world = { root: await createClaudeProject('cb-hooks-doctor-') }; });
afterEach(async () => { await removeProject(world.root); });

async function findingPath(code: string): Promise<string | null | undefined> {
  return (await doctorFindings(world)).find((finding) => finding.code === code)?.path;
}

describe('doctor looks for the hooks in the file of the mode', () => {
  it('reports neither INTEGRATION_MISSING nor HOOKS_IN_VERSIONED_SETTINGS when the hooks are in the file of each mode', async () => {
    await runCli(world.root, INIT);
    expect(await doctorCodes(world)).not.toContain('INTEGRATION_MISSING');
    expect(await doctorCodes(world)).not.toContain(HOOKS_IN_VERSIONED_SETTINGS);
    await runCli(world.root, INIT_SHARED);
    expect(await doctorCodes(world)).not.toContain('INTEGRATION_MISSING');
    expect(await doctorCodes(world)).not.toContain(HOOKS_IN_VERSIONED_SETTINGS);
  });

  it('points INTEGRATION_MISSING at settings.local.json when the hooks are only in settings.json (default mode)', async () => {
    await runCli(world.root, INIT);
    await seedIn(world, SHARED, (await readIn(world, LOCAL))!);
    await rm(join(world.root, LOCAL));
    expect(await findingPath('INTEGRATION_MISSING')).toBe(LOCAL);
  });

  it('points INTEGRATION_MISSING at settings.json when the hooks are only in settings.local.json (--no-gitignore)', async () => {
    await runCli(world.root, INIT_SHARED);
    await seedIn(world, LOCAL, (await readIn(world, SHARED))!);
    await seedIn(world, SHARED, '{}\n');
    expect(await findingPath('INTEGRATION_MISSING')).toBe(SHARED);
  });
});

describe('doctor warns HOOKS_IN_VERSIONED_SETTINGS when the script is ignored and the hooks are versioned', () => {
  it('warns in the broken scenario of the default mode and fix moves the hooks to settings.local.json', async () => {
    await runCli(world.root, INIT);
    await seedIn(world, SHARED, (await readIn(world, LOCAL))!);
    expect(await findingPath(HOOKS_IN_VERSIONED_SETTINGS)).toBe(SHARED);
    expect((await runCli(world.root, ['fix', '--yes', '--json'])).code).toBeLessThanOrEqual(1);
    expect([await hookEvents(world, SHARED), await hookEvents(world, LOCAL)]).toEqual([[], OWNED_EVENTS]);
    expect(await doctorCodes(world)).not.toContain(HOOKS_IN_VERSIONED_SETTINGS);
  });

  it('warns with --no-gitignore only when .gitignore lists the script', async () => {
    await runCli(world.root, INIT_SHARED);
    expect(await doctorCodes(world)).not.toContain(HOOKS_IN_VERSIONED_SETTINGS);
    await writeFile(join(world.root, '.gitignore'), `/${SCRIPT}\n`, 'utf8');
    expect(await findingPath(HOOKS_IN_VERSIONED_SETTINGS)).toBe(SHARED);
  });

  it('keeps the hooks out of the warning after remove', async () => {
    await runCli(world.root, INIT_SHARED);
    expect((await runCli(world.root, REMOVE)).code).toBe(0);
    expect(await doctorCodes(world)).not.toContain(HOOKS_IN_VERSIONED_SETTINGS);
  });
});
