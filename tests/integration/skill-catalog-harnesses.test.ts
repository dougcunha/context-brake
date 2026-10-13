import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HARNESS_IDS } from '../../src/core/contracts/harness.js';
import { resolveSkillFolders } from '../../src/infrastructure/harnesses/skill-folders.js';
import { createSkillCatalogReader } from '../../src/infrastructure/skills/skill-catalog.js';
import { createSkillProject, frontmatter, type SkillProject } from '../helpers/skill-fixtures.js';

let project: SkillProject;

beforeEach(async () => {
  project = await createSkillProject();
});
afterEach(async () => {
  await project.remove();
});

describe('skill catalog per harness (prd-20 FR-01, OBJ-03, TC-01)', () => {
  it.each(HARNESS_IDS)('%s reads a skill from each folder it declares', async (harness) => {
    const folders = resolveSkillFolders(harness);
    expect(folders.length).toBeGreaterThan(0);
    for (const [index, folder] of folders.entries()) await project.addSkill('one', frontmatter(`name: skill-${String(index)}`), folder);
    const { skills, warnings } = await createSkillCatalogReader()(harness, project.root);
    expect(skills.map((skill) => [skill.name, skill.folder])).toEqual(folders.map((folder, index) => [`skill-${String(index)}`, folder]));
    expect(warnings).toEqual([]);
  });

  it.each(HARNESS_IDS)('%s returns an empty catalog for a project without skill folders', async (harness) => {
    expect(await createSkillCatalogReader()(harness, project.root)).toEqual({ skills: [], warnings: [] });
  });
});
