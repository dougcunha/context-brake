import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BLOCK_START } from '../../src/core/services/gitignore-block.js';
import { blockLines, makeGitProject, planOf, readIgnore, removeProject, runInit } from '../helpers/gitignore-world.js';

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false);
}

async function config(root: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(root, 'context-brake.config.json'), 'utf8')) as Record<string, unknown>;
}

describe('FR-02 the list follows the options and a second run plans nothing (prd-17, TC-05)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject({ codex: true }); });
  afterEach(async () => { await removeProject(root); });

  it('gains and loses the mod lines as automatic restart is turned on and off (FR-02, TC-05)', async () => {
    await runInit(root, ['--yes', '--auto-restart']);
    expect(blockLines(await readIgnore(root)).some((line) => line.includes('claude-mod'))).toBe(true);
    await runInit(root, ['--yes', '--no-auto-restart']);
    expect(blockLines(await readIgnore(root)).some((line) => line.includes('claude-mod'))).toBe(false);
  });
});

describe('FR-01 the runtime state files init writes are listed too (prd-17, CR-02, TC-05)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('lists the runtime state files init writes and drops them with the feature (FR-01, OBJ-01, CR-02, TC-05)', async () => {
    await runInit(root, ['--yes', '--auto-restart']);
    const lines = blockLines(await readIgnore(root));
    expect(lines).toEqual(expect.arrayContaining(['/.context-brake/runtime/claude-mod-install.json', '/.context-brake/runtime/claude-statusline.json']));
    expect(lines.some((line) => line.includes('settings.local'))).toBe(false);
    await runInit(root, ['--yes', '--no-auto-restart']);
    const after = blockLines(await readIgnore(root));
    expect(after).not.toContain('/.context-brake/runtime/claude-mod-install.json');
    expect(after).toContain('/.context-brake/runtime/claude-statusline.json');
  });
});

describe('FR-02 harness lines and stability (prd-17, TC-05)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject({ codex: true }); });
  afterEach(async () => { await removeProject(root); });

  it('drops a harness script line when the harness is turned off (FR-02, TC-05)', async () => {
    await runInit(root, ['--yes']);
    expect(blockLines(await readIgnore(root))).toContain('/.codex/hooks/context-brake.mjs');
    await runInit(root, ['--yes', '--exclude-harness', 'codex-cli']);
    expect(blockLines(await readIgnore(root))).not.toContain('/.codex/hooks/context-brake.mjs');
  });
  it('plans no change on a second run, with the block or without it (FR-02, NFR-01, TC-05)', async () => {
    await runInit(root, ['--yes', '--auto-restart']);
    expect((await planOf(root, [])).plan.changes).toEqual([]);
  });
});

describe('FR-05 the opt-out is stored and reversible (prd-17, TC-05)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('removes the block, deletes a file that held only it, and a plain init keeps it off (FR-05, TC-05)', async () => {
    await runInit(root, ['--yes']);
    await runInit(root, ['--yes', '--no-gitignore']);
    expect(await exists(join(root, '.gitignore'))).toBe(false);
    expect((await config(root)).gitIgnore).toBe(false);
    await runInit(root, ['--yes']);
    expect(await exists(join(root, '.gitignore'))).toBe(false);
  });
  it('keeps the user lines when the block goes away and brings it back with --gitignore (FR-05, TC-05)', async () => {
    await writeFile(join(root, '.gitignore'), 'dist/\n', 'utf8');
    await runInit(root, ['--yes']);
    await runInit(root, ['--yes', '--no-gitignore']);
    expect(await readIgnore(root)).toBe('dist/\n');
    await runInit(root, ['--yes', '--gitignore']);
    expect((await readIgnore(root)) ?? '').toContain(BLOCK_START);
    expect(await config(root)).not.toHaveProperty('gitIgnore');
  });
});

describe('FR-04 malformed markers (prd-17, TC-05)', () => {
  it('leaves .gitignore untouched, reports the conflict, and still installs (FR-04, TC-05)', async () => {
    const root = await makeGitProject();
    try {
      const broken = `${BLOCK_START}\n/only-a-start\n`;
      await writeFile(join(root, '.gitignore'), broken, 'utf8');
      const run = await runInit(root, ['--yes']);
      expect(await readIgnore(root)).toBe(broken);
      expect(`${run.stdout}${run.stderr}`).toContain('GITIGNORE_MARKERS_MALFORMED');
      expect(await exists(join(root, 'context-brake.config.json'))).toBe(true);
    } finally {
      await removeProject(root);
    }
  });
});
