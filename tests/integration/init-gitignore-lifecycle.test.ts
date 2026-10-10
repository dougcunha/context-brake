import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BLOCK_START } from '../../src/core/services/gitignore-block.js';
import { blockLines, makeGitProject, planOf, readIgnore, removeProject, runInit } from '../helpers/gitignore-world.js';

const MOD_INSTALL_STATE = '/.context-brake/runtime/claude-mod-install.json';
const STATUSLINE_STATE = '/.context-brake/runtime/claude-statusline.json';

async function config(root: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(root, 'context-brake.config.json'), 'utf8')) as Record<string, unknown>;
}

describe('FR-01, FR-02 the list follows the options (prd-17, CR-02, TC-04, TC-05)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject({ codex: true }); });
  afterEach(async () => { await removeProject(root); });

  it('adds the mod files, the handoff ignore, and their runtime state with automatic restart and drops them when it is turned off (FR-01, FR-02, OBJ-01, CR-02, TC-04, TC-05)', async () => {
    await runInit(root, ['--yes', '--auto-restart']);
    const on = blockLines(await readIgnore(root));
    expect(on).toEqual(expect.arrayContaining(['/.context-brake/.gitignore', MOD_INSTALL_STATE, STATUSLINE_STATE]));
    expect(on.some((line) => line.startsWith('/.context-brake/claude-mod/'))).toBe(true);
    await runInit(root, ['--yes', '--no-auto-restart']);
    const off = blockLines(await readIgnore(root));
    expect(off.filter((line) => line.includes('claude-mod') || line === '/.context-brake/.gitignore')).toEqual([]);
    expect(off).toContain(STATUSLINE_STATE);
  });
  it('drops a harness script line when the harness is turned off (FR-02, TC-05)', async () => {
    await runInit(root, ['--yes']);
    expect(blockLines(await readIgnore(root))).toContain('/.codex/hooks/context-brake.mjs');
    await runInit(root, ['--yes', '--exclude-harness', 'codex-cli']);
    expect(blockLines(await readIgnore(root))).not.toContain('/.codex/hooks/context-brake.mjs');
  });
});

describe('FR-04, FR-05 opt-out and malformed markers (prd-17, TC-05)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('removes the block but keeps the user lines, stores the opt-out, and brings the block back with --gitignore (FR-05, TC-05)', async () => {
    await writeFile(join(root, '.gitignore'), 'dist/\n', 'utf8');
    await runInit(root, ['--yes']);
    await runInit(root, ['--yes', '--no-gitignore']);
    expect([await readIgnore(root), (await config(root)).gitIgnore]).toEqual(['dist/\n', false]);
    expect((await planOf(root, [])).plan.changes).toEqual([]);
    await runInit(root, ['--yes', '--gitignore']);
    expect((await readIgnore(root)) ?? '').toContain(`dist/\n\n${BLOCK_START}`);
    expect(await config(root)).not.toHaveProperty('gitIgnore');
  });
  it('leaves .gitignore untouched, reports the conflict, and still installs (FR-04, TC-05)', async () => {
    const broken = `${BLOCK_START}\n/only-a-start\n`;
    await writeFile(join(root, '.gitignore'), broken, 'utf8');
    const run = await runInit(root, ['--yes']);
    expect(await readIgnore(root)).toBe(broken);
    expect(`${run.stdout}${run.stderr}`).toContain('GITIGNORE_MARKERS_MALFORMED');
    expect((await config(root)).activeHarnesses).toEqual(['claude-code']);
  });
});
