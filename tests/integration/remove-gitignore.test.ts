import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BLOCK_START } from '../../src/core/services/gitignore-block.js';
import { runInProcessCliWith } from '../helpers/in-process-cli.js';
import { fakeProcessRunner } from '../helpers/fake-process-runner.js';
import { makeGitProject, planOf, readIgnore, removeProject, runInit } from '../helpers/gitignore-world.js';

async function runRemove(root: string, args: readonly string[]) {
  return runInProcessCliWith(['remove', ...args], { cwd: root, overrides: { runner: fakeProcessRunner } });
}

describe('FR-06, OBJ-05 remove takes the .gitignore block out (prd-17, TC-06)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('restores the original file after init then remove (FR-06, OBJ-05, TC-06)', async () => {
    const original = '# mine\nnode_modules/\n\ndist/\n';
    await writeFile(join(root, '.gitignore'), original, 'utf8');
    await runInit(root, ['--yes']);
    expect((await readIgnore(root)) ?? '').toContain(BLOCK_START);
    expect((await runRemove(root, ['--yes'])).code).toBeLessThanOrEqual(1);
    expect(await readIgnore(root)).toBe(original);
  });
  it('deletes a .gitignore that held only the block (FR-06, TC-06)', async () => {
    await runInit(root, ['--yes']);
    await runRemove(root, ['--yes']);
    expect(await readIgnore(root)).toBeNull();
  });
});

describe('FR-06 remove dry run and absent block (prd-17, TC-06)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('shows the block removal in a dry run and writes nothing (FR-06, TC-06)', async () => {
    await runInit(root, ['--yes']);
    const before = await readIgnore(root);
    const run = await runRemove(root, ['--dry-run', '--json']);
    expect(JSON.parse(run.stdout).plan.changes.find((change: { path: string }) => change.path === '.gitignore')).toMatchObject({ kind: 'delete', owner: 'gitignore' });
    expect(await readIgnore(root)).toBe(before);
  });
  it('plans no .gitignore change when there is no block (FR-06, TC-06)', async () => {
    await writeFile(join(root, '.gitignore'), 'dist/\n', 'utf8');
    await runInit(root, ['--yes', '--no-gitignore']);
    const run = await runRemove(root, ['--dry-run', '--json']);
    expect(JSON.parse(run.stdout).plan.changes.some((change: { path: string }) => change.path === '.gitignore')).toBe(false);
    expect((await planOf(root, ['--no-gitignore'])).plan.changes).toEqual([]);
  });
});
