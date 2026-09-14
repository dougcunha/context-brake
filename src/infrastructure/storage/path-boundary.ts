import { realpath } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

export class RepositoryBoundaryError extends Error {
  constructor(readonly targetPath: string, readonly projectRoot: string) {
    super(`Path '${targetPath}' resolves outside repository root '${projectRoot}'`);
    this.name = 'RepositoryBoundaryError';
  }
}

export function normalizeSeparators(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function arePathsEqual(pathA: string, pathB: string): boolean {
  if (process.platform === 'win32') {
    return pathA.toLowerCase() === pathB.toLowerCase();
  }
  return pathA === pathB;
}

async function findExistingAncestor(startPath: string): Promise<{ ancestor: string; missing: string[] }> {
  let current = startPath;
  const missing: string[] = [];
  while (true) {
    missing.unshift(basename(current));
    const parent = dirname(current);
    if (parent === current) return { ancestor: current, missing };
    current = parent;
    try {
      const canonical = await realpath(current);
      return { ancestor: canonical, missing };
    } catch {
      continue;
    }
  }
}

export async function resolveCanonicalPath(baseDir: string, targetPath: string): Promise<string> {
  const fullPath = resolve(baseDir, targetPath);
  try {
    const canonical = await realpath(fullPath);
    return normalizeSeparators(canonical);
  } catch {
    const { ancestor, missing } = await findExistingAncestor(fullPath);
    const resolved = missing.length > 0 ? resolve(ancestor, ...missing) : ancestor;
    return normalizeSeparators(resolved);
  }
}

export async function isWithinRepository(projectRoot: string, targetPath: string): Promise<boolean> {
  const canonicalRoot = await resolveCanonicalPath(projectRoot, '.');
  const canonicalTarget = await resolveCanonicalPath(projectRoot, targetPath);
  const rootPrefix = canonicalRoot.endsWith('/') ? canonicalRoot : `${canonicalRoot}/`;
  if (process.platform === 'win32') {
    return canonicalTarget.toLowerCase().startsWith(rootPrefix.toLowerCase()) || canonicalTarget.toLowerCase() === canonicalRoot.toLowerCase();
  }
  return canonicalTarget.startsWith(rootPrefix) || canonicalTarget === canonicalRoot;
}

export async function assertWithinRepository(projectRoot: string, targetPath: string): Promise<string> {
  const isInside = await isWithinRepository(projectRoot, targetPath);
  if (!isInside) {
    throw new RepositoryBoundaryError(targetPath, projectRoot);
  }
  return resolveCanonicalPath(projectRoot, targetPath);
}

export function computeFileIdentity(canonicalPath: string, dev?: number, ino?: number): string {
  if (process.platform !== 'win32' && dev !== undefined && ino !== undefined && ino !== 0) {
    return `${dev}:${ino}`;
  }
  return process.platform === 'win32' ? canonicalPath.toLowerCase() : canonicalPath;
}
