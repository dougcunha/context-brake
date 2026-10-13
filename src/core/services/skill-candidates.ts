import type { HarnessId } from '../contracts/harness.js';
import type { CatalogSkill } from '../contracts/skill-catalog.js';

export type SkillOrigin = { readonly harness: HarnessId; readonly folder: string };
export type SkillCandidate = { readonly name: string; readonly description: string; readonly origins: readonly SkillOrigin[] };
export type HarnessCatalog = { readonly harness: HarnessId; readonly skills: readonly CatalogSkill[] };

function byHarness(left: SkillOrigin, right: SkillOrigin): number {
  return left.harness.localeCompare(right.harness) || left.folder.localeCompare(right.folder);
}

export function mergeCatalogs(catalogs: readonly HarnessCatalog[]): SkillCandidate[] {
  const byName = new Map<string, { description: string; origins: SkillOrigin[] }>();
  for (const { harness, skills } of catalogs) {
    for (const skill of skills) {
      const known = byName.get(skill.name) ?? { description: skill.description, origins: [] };
      known.origins.push({ harness, folder: skill.folder });
      byName.set(skill.name, known);
    }
  }
  return [...byName].map(([name, { description, origins }]) => ({ name, description, origins: [...origins].sort(byHarness) }));
}
