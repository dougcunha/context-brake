import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attemptLink, requireLink } from '../helpers/link-capability.js';
import { blockLines, makeGitProject, planOf, readIgnore, removeProject, runInit } from '../helpers/gitignore-world.js';

const OWNED_LINES = ['/.claude/hooks/context-brake-statusline.mjs', '/.claude/hooks/context-brake.mjs', '/.context-brake/manifest.json', '/.context-brake/runtime/claude-statusline.json', '/context-brake.config.json'];

describe('FR-01, FR-03, FR-04, NFR-01 init writes the .gitignore block (prd-17, TC-04, TC-05)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('plans the block as a create and lists exactly the files ContextBrake owns, anchored, and none of the harness files it edits (FR-01, FR-03, FR-04, TC-04)', async () => {
    expect((await planOf(root, [])).plan.changes.find((change) => change.path === '.gitignore')).toMatchObject({ kind: 'create', owner: 'gitignore' });
    expect((await runInit(root, ['--yes'])).code).toBeLessThanOrEqual(1);
    expect(blockLines(await readIgnore(root))).toEqual(OWNED_LINES);
  });
  it('keeps CRLF user lines byte for byte, writes the block with CRLF, and plans no change on a second run (FR-02, FR-04, NFR-01, TC-04, TC-05)', async () => {
    const user = '# mine\r\nnode_modules/\r\n';
    await writeFile(join(root, '.gitignore'), user, 'utf8');
    await runInit(root, ['--yes']);
    const text = (await readIgnore(root)) ?? '';
    expect(text.startsWith(`${user}\r\n# >>> context-brake`)).toBe(true);
    expect(text.replace(/\r\n/g, '')).not.toContain('\n');
    expect((await planOf(root, [])).plan.changes).toEqual([]);
  });
});

describe('FR-07 outside a Git working tree (prd-17, TC-04)', () => {
  it('writes no .gitignore and reports GITIGNORE_NO_GIT, then writes the block once a parent folder is a Git working tree (FR-07, TC-04)', async () => {
    const root = await makeGitProject({ git: false });
    const project = join(root, 'package');
    try {
      await cp(join(root, '.claude'), join(project, '.claude'), { recursive: true });
      const report = await planOf(project, []);
      expect(report.plan.changes.some((change) => change.path === '.gitignore')).toBe(false);
      expect(report.findings.map((finding) => finding.code)).toContain('GITIGNORE_NO_GIT');
      await runInit(project, ['--yes']);
      expect(await stat(join(project, '.gitignore')).then(() => true, () => false)).toBe(false);
      expect(await readFile(join(project, 'context-brake.config.json'), 'utf8')).toContain('activeHarnesses');
      await mkdir(join(root, '.git'));
      await runInit(project, ['--yes']);
      expect(blockLines(await readIgnore(project))).toEqual(OWNED_LINES);
    } finally {
      await removeProject(root);
    }
  });
});

describe('FR-03 a harness folder that is a link into the repository (prd-17, TC-02, TC-04)', () => {
  it('lists the link path and the link target path, so a Windows junction leaves no owned file visible (FR-03, TC-04, BUG-01)', async (ctx) => {
    const root = await makeGitProject({ git: true });
    try {
      await mkdir(join(root, '.agents'), { recursive: true });
      await rm(join(root, '.claude'), { recursive: true, force: true });
      await requireLink(ctx, await attemptLink(join(root, '.agents'), join(root, '.claude')), join(root, '.claude'));
      await writeFile(join(root, '.agents/settings.json'), '{\n}\n', 'utf8');
      await runInit(root, ['--yes']);
      const lines = blockLines(await readIgnore(root));
      expect(lines).toContain('/.agents/hooks/context-brake.mjs');
      expect(lines).toContain('/.claude/hooks/context-brake.mjs');
    } finally {
      await removeProject(root);
    }
  });
});
