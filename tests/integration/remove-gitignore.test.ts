import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BLOCK_START } from '../../src/core/services/gitignore-block.js';
import { runInProcessCliWith } from '../helpers/in-process-cli.js';
import { fakeProcessRunner } from '../helpers/fake-process-runner.js';
import { makeGitProject, readIgnore, removeProject, runInit } from '../helpers/gitignore-world.js';

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
  it('shows the deletion of a .gitignore that held only the block in a dry run, then deletes it (FR-06, TC-06)', async () => {
    await runInit(root, ['--yes']);
    const before = await readIgnore(root);
    const dryRun = await runRemove(root, ['--dry-run', '--json']);
    expect(JSON.parse(dryRun.stdout).plan.changes.find((change: { path: string }) => change.path === '.gitignore')).toMatchObject({ kind: 'delete', owner: 'gitignore' });
    expect(await readIgnore(root)).toBe(before);
    await runRemove(root, ['--yes']);
    expect(await readIgnore(root)).toBeNull();
  });
});
