import type { HarnessId } from './harness.js';

export type CatalogSkill = { readonly name: string; readonly description: string; readonly folder: string };
export type SkillCatalog = { readonly skills: readonly CatalogSkill[]; readonly warnings: readonly string[] };
export type SkillCatalogReader = (harness: HarnessId, projectRoot: string) => Promise<SkillCatalog>;
