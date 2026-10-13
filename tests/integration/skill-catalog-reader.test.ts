import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readSkillFolders } from '../../src/infrastructure/skills/skill-catalog-reader.js';
import { createSkillProject, frontmatter, SKILL_FOLDER, type SkillProject } from '../helpers/skill-fixtures.js';

let project: SkillProject;

beforeEach(async () => {
  project = await createSkillProject();
});
afterEach(async () => {
  await project.remove();
});

describe('skill catalog reader (prd-20 FR-01, FR-02, TC-02)', () => {
  it('reads name, description, and folder from the frontmatter', async () => {
    await project.addSkill('a', frontmatter('name: sdd-snapshot\ndescription: "Writes the context file"'));
    await project.addSkill('b', frontmatter("description: 'No name here'"));
    const { skills, warnings } = await readSkillFolders(project.root, [SKILL_FOLDER]);
    expect(skills).toEqual([
      { name: 'sdd-snapshot', description: 'Writes the context file', folder: SKILL_FOLDER },
      { name: 'b', description: 'No name here', folder: SKILL_FOLDER },
    ]);
    expect(warnings).toEqual([]);
  });

  it('returns an empty catalog without a warning when the folders do not exist', async () => {
    expect(await readSkillFolders(project.root, [SKILL_FOLDER, '.claude/skills'])).toEqual({ skills: [], warnings: [] });
  });

});

describe('skill catalog reader filtering (prd-20 FR-02, TC-02)', () => {
  it('ignores malformed frontmatter, invalid names, and directories without SKILL.md', async () => {
    await project.addSkill('good', frontmatter('name: good'));
    await project.addSkill('broken', '---\nname: [unclosed\n');
    await project.addSkill('slash', frontmatter('name: a/b'));
    await project.addSkill('space', frontmatter('name: a b'));
    await project.addSkill('no-frontmatter', '# Just a title\n');
    await mkdir(join(project.root, SKILL_FOLDER, 'empty'), { recursive: true });
    await writeFile(join(project.root, SKILL_FOLDER, 'file.txt'), 'not a directory');
    const { skills, warnings } = await readSkillFolders(project.root, [SKILL_FOLDER]);
    expect(skills.map((skill) => skill.name)).toEqual(['good', 'no-frontmatter']);
    expect(warnings).toEqual([]);
  });

  it('gives a block scalar description as empty and keeps the skill', async () => {
    await project.addSkill('folded', frontmatter('name: folded\ndescription: >\n  long text\n  more'));
    expect((await readSkillFolders(project.root, [SKILL_FOLDER])).skills).toEqual([{ name: 'folded', description: '', folder: SKILL_FOLDER }]);
  });

  it('keeps the first of two folders that hold the same name', async () => {
    await project.addSkill('x', frontmatter('name: same\ndescription: first'), '.claude/skills');
    await project.addSkill('x', frontmatter('name: same\ndescription: second'));
    const { skills } = await readSkillFolders(project.root, ['.claude/skills', SKILL_FOLDER]);
    expect(skills).toEqual([{ name: 'same', description: 'first', folder: '.claude/skills' }]);
  });
});
