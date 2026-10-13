import { open, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { isSkillName } from '../../core/contracts/skill-name.js';
import type { CatalogSkill, SkillCatalog } from '../../core/contracts/skill-catalog.js';
import { parseFrontmatter } from './frontmatter.js';

export const MAX_FRONTMATTER_BYTES = 8192;
export const MAX_SKILL_DIRECTORIES = 500;
const SKILL_FILE = 'SKILL.md';
const MISSING_CODES: ReadonlySet<string> = new Set(['ENOENT', 'ENOTDIR']);
const CHUNK_SIZE = 32;

type Entry = { readonly folder: string; readonly directory: string; readonly entry: string };
type Found = { readonly skill: CatalogSkill | null; readonly warning: string | null };

function errorCode(error: unknown): string {
  return error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : 'unreadable';
}

async function readHead(file: string): Promise<string | null> {
  try {
    const handle = await open(file, 'r');
    try {
      const buffer = Buffer.alloc(MAX_FRONTMATTER_BYTES);
      const { bytesRead } = await handle.read(buffer, 0, MAX_FRONTMATTER_BYTES, 0);
      return buffer.toString('utf8', 0, bytesRead);
    } finally {
      await handle.close();
    }
  } catch (error: unknown) {
    if (MISSING_CODES.has(errorCode(error))) return null;
    throw error;
  }
}

async function readSkill({ folder, directory, entry }: Entry): Promise<Found> {
  const path = join(directory, entry);
  try {
    if (!(await stat(path)).isDirectory()) return { skill: null, warning: null };
    const head = await readHead(join(path, SKILL_FILE));
    if (head === null) return { skill: null, warning: null };
    const { name, description } = parseFrontmatter(head);
    const resolved = name ?? entry;
    return { skill: isSkillName(resolved) ? { name: resolved, description, folder } : null, warning: null };
  } catch (error: unknown) {
    return MISSING_CODES.has(errorCode(error)) ? { skill: null, warning: null } : { skill: null, warning: `${folder}/${entry}: ${errorCode(error)}` };
  }
}

async function readChunked(entries: readonly Entry[]): Promise<Found[]> {
  const found: Found[] = [];
  for (let start = 0; start < entries.length; start += CHUNK_SIZE) found.push(...await Promise.all(entries.slice(start, start + CHUNK_SIZE).map(readSkill)));
  return found;
}

async function listFolder(projectRoot: string, folder: string): Promise<{ entries: Entry[]; warning: string | null }> {
  const directory = join(projectRoot, folder);
  try {
    const names = (await readdir(directory)).sort().slice(0, MAX_SKILL_DIRECTORIES);
    return { entries: names.map((entry) => ({ folder, directory, entry })), warning: null };
  } catch (error: unknown) {
    return { entries: [], warning: MISSING_CODES.has(errorCode(error)) ? null : `${folder}: ${errorCode(error)}` };
  }
}

export async function readSkillFolders(projectRoot: string, folders: readonly string[]): Promise<SkillCatalog> {
  const skills = new Map<string, CatalogSkill>();
  const warnings: string[] = [];
  for (const folder of folders) {
    const listed = await listFolder(projectRoot, folder);
    if (listed.warning !== null) warnings.push(listed.warning);
    for (const { skill, warning } of await readChunked(listed.entries)) {
      if (warning !== null) warnings.push(warning);
      if (skill !== null && !skills.has(skill.name)) skills.set(skill.name, skill);
    }
  }
  return { skills: [...skills.values()], warnings };
}
