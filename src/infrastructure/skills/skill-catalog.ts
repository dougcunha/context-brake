import type { SkillCatalogReader } from '../../core/contracts/skill-catalog.js';
import { resolveSkillFolders } from '../harnesses/skill-folders.js';
import { readSkillFolders } from './skill-catalog-reader.js';

export function createSkillCatalogReader(): SkillCatalogReader {
  return (harness, projectRoot) => readSkillFolders(projectRoot, resolveSkillFolders(harness));
}
