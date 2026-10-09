import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attemptLink, requireLink } from '../helpers/link-capability.js';
import { blockLines, makeGitProject, planOf, readIgnore, removeProject, runInit } from '../helpers/gitignore-world.js';

describe('FR-01, FR-03, FR-04, FR-07 init writes the .gitignore block (prd-17, TC-04)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('lists exactly the files ContextBrake owns, anchored, and none of the harness files it edits (FR-01, FR-03, TC-04)', async () => {
    expect((await runInit(root, ['--yes'])).code).toBeLessThanOrEqual(1);
    const lines = blockLines(await readIgnore(root));
    expect(lines).toEqual(expect.arrayContaining(['/.claude/hooks/context-brake.mjs', '/.claude/hooks/context-brake-statusline.mjs', '/.context-brake/manifest.json', '/context-brake.config.json']));
    expect(lines.every((line) => line.startsWith('/'))).toBe(true);
    expect(lines.join('\n')).not.toContain('settings');
  });
  it('adds the mod files and the handoff ignore when automatic restart is on (FR-01, TC-04)', async () => {
    await runInit(root, ['--yes', '--auto-restart']);
    const lines = blockLines(await readIgnore(root));
    expect(lines).toContain('/.context-brake/.gitignore');
    expect(lines.some((line) => line.startsWith('/.context-brake/claude-mod/'))).toBe(true);
  });
  it('keeps the user lines byte for byte, with CRLF endings used for the block too (FR-04, NFR-01, TC-04)', async () => {
    const user = '# mine\r\nnode_modules/\r\n';
    await writeFile(join(root, '.gitignore'), user, 'utf8');
    await runInit(root, ['--yes']);
    const text = (await readIgnore(root)) ?? '';
    expect(text.startsWith(`${user}\r\n# >>> context-brake`)).toBe(true);
    expect(text.replace(/\r\n/g, '')).not.toContain('\n');
  });
});

describe('FR-04 the block is a planned change (prd-17, TC-04)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('shows the block in the plan with owner gitignore and writes nothing on a dry run (FR-04, TC-04)', async () => {
    const report = await planOf(root, []);
    expect(report.plan.changes.find((change) => change.path === '.gitignore')).toMatchObject({ kind: 'create', owner: 'gitignore' });
    expect(await readIgnore(root)).toBeNull();
  });
});

describe('FR-07 outside a Git working tree (prd-17, TC-04)', () => {
  it('writes no .gitignore and reports GITIGNORE_NO_GIT (FR-07, TC-04)', async () => {
    const root = await makeGitProject({ git: false });
    try {
      const report = await planOf(root, []);
      expect(report.plan.changes.some((change) => change.path === '.gitignore')).toBe(false);
      expect(report.findings.map((finding) => finding.code)).toContain('GITIGNORE_NO_GIT');
      await runInit(root, ['--yes']);
      expect(await stat(join(root, '.gitignore')).then(() => true, () => false)).toBe(false);
      expect(await readFile(join(root, 'context-brake.config.json'), 'utf8')).toContain('activeHarnesses');
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
