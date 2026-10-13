import { chmod, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_FRONTMATTER_BYTES, MAX_SKILL_DIRECTORIES, readSkillFolders } from '../../src/infrastructure/skills/skill-catalog-reader.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';
import { createSkillProject, frontmatter, SKILL_FOLDER, type SkillProject } from '../helpers/skill-fixtures.js';

let project: SkillProject;

beforeEach(async () => {
  project = await createSkillProject();
});
afterEach(async () => {
  await project.remove();
});

describe('skill catalog reader bounds (prd-20 FR-02, TC-02)', () => {
  it('reads at most the first 8 KiB of a very large SKILL.md', async () => {
    await project.addSkill('huge', `---\nname: huge\ndescription: ${'x'.repeat(1_000_000)}\n---\n`);
    const [skill] = (await readSkillFolders(project.root, [SKILL_FOLDER])).skills;
    expect(skill?.name).toBe('huge');
    expect(skill?.description.length).toBeLessThanOrEqual(MAX_FRONTMATTER_BYTES);
  });

  it('stays inside the directory bound for a folder with 1000 skills', async () => {
    await Promise.all(Array.from({ length: 1000 }, (_, index) => project.addSkill(`skill-${String(index).padStart(4, '0')}`, frontmatter('description: bulk'))));
    const { skills } = await readSkillFolders(project.root, [SKILL_FOLDER]);
    expect(skills).toHaveLength(MAX_SKILL_DIRECTORIES);
  });

  it('warns once for an unreadable folder and still reads the others', async ({ skip }) => {
    if (process.platform === 'win32') skip('directory permissions are not enforced the same way on Windows');
    await project.addSkill('ok', frontmatter('name: ok'), '.claude/skills');
    await project.addSkill('locked', frontmatter('name: locked'));
    await chmod(join(project.root, SKILL_FOLDER), 0o000);
    try {
      const { skills, warnings } = await readSkillFolders(project.root, [SKILL_FOLDER, '.claude/skills']);
      expect(skills.map((skill) => skill.name)).toEqual(['ok']);
      expect(warnings).toEqual([`${SKILL_FOLDER}: EACCES`]);
    } finally {
      await chmod(join(project.root, SKILL_FOLDER), 0o755);
    }
  });
});

describe('skill catalog reader with links (prd-20 NFR-04, TC-12)', () => {
  it('follows a linked skill directory (symbolic link, or junction on Windows)', async (ctx) => {
    await project.addSkill('real', frontmatter('name: linked-skill'), 'elsewhere');
    await mkdir(join(project.root, SKILL_FOLDER), { recursive: true });
    const link = join(project.root, SKILL_FOLDER, 'alias');
    await requireLink(ctx, await attemptLink(join(project.root, 'elsewhere', 'real'), link), link);
    const { skills } = await readSkillFolders(project.root, [SKILL_FOLDER]);
    expect(skills).toEqual([{ name: 'linked-skill', description: '', folder: SKILL_FOLDER }]);
  });

  it('ignores a broken link without a warning', async (ctx) => {
    await mkdir(join(project.root, SKILL_FOLDER), { recursive: true });
    const link = join(project.root, SKILL_FOLDER, 'dangling');
    await requireLink(ctx, await attemptLink(join(project.root, 'does-not-exist'), link), link);
    expect(await readSkillFolders(project.root, [SKILL_FOLDER])).toEqual({ skills: [], warnings: [] });
  });
});
