import type { HarnessId } from '../../src/core/contracts/harness.js';
import type { CatalogSkill, SkillCatalogReader } from '../../src/core/contracts/skill-catalog.js';

export type CatalogFixture = Partial<Record<HarnessId, readonly CatalogSkill[]>>;

export function skill(name: string, description = '', folder = '.claude/skills'): CatalogSkill {
  return { name, description, folder };
}

export function fakeCatalog(fixture: CatalogFixture, warnings: readonly string[] = []): SkillCatalogReader {
  return (harness) => Promise.resolve({ skills: fixture[harness] ?? [], warnings });
}

export function throwingCatalog(message: string): SkillCatalogReader {
  return () => Promise.reject(new Error(message));
}

export const BLANK_ANSWERS: readonly string[] = Array.from({ length: 12 }, () => '');
