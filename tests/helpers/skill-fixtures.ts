import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const SKILL_FOLDER = '.agents/skills';

export type SkillProject = {
  readonly root: string;
  addSkill(directory: string, content: string, folder?: string): Promise<void>;
  remove(): Promise<void>;
};

export function frontmatter(fields: string): string {
  return `---\n${fields}\n---\n\n# Body\n`;
}

export async function createSkillProject(): Promise<SkillProject> {
  const root = await mkdtemp(join(tmpdir(), 'cb-skills-'));
  return {
    root,
    async addSkill(directory, content, folder = SKILL_FOLDER) {
      await mkdir(join(root, folder, directory), { recursive: true });
      await writeFile(join(root, folder, directory, 'SKILL.md'), content);
    },
    remove: () => rm(root, { recursive: true, force: true }),
  };
}
