import { realpath } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { assertWithinRepository, normalizeSeparators } from '../../storage/path-boundary.js';

type AncestorResult = {
  ancestor: string;
  missing: string[];
};

async function findExistingAncestor(startPath: string): Promise<AncestorResult> {
  let current = startPath;
  const missing: string[] = [];
  while (true) {
    missing.unshift(basename(current));
    const parent = dirname(current);
    if (parent === current) {
      return { ancestor: current, missing };
    }
    current = parent;
    try {
      const canonical = await realpath(current);
      return { ancestor: canonical, missing };
    } catch {
      /* climb up */
    }
  }
}

async function resolveCanonicalTarget(fullPath: string): Promise<string> {
  try {
    const existing = await realpath(fullPath);
    return normalizeSeparators(existing);
  } catch {
    const { ancestor, missing } = await findExistingAncestor(fullPath);
    const target = missing.length > 0 ? resolve(ancestor, ...missing) : ancestor;
    return normalizeSeparators(target);
  }
}

export async function resolveChangeTarget(projectRoot: string, targetPath: string): Promise<string> {
  await assertWithinRepository(projectRoot, targetPath);
  const fullPath = resolve(projectRoot, targetPath);
  const canonical = await resolveCanonicalTarget(fullPath);
  await assertWithinRepository(projectRoot, canonical);
  return canonical;
}
