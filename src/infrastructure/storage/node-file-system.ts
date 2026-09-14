import { createHash } from 'node:crypto';
import { lstat, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FileSnapshot } from '../../core/contracts/changes.js';
import { assertWithinRepository, computeFileIdentity } from './path-boundary.js';

export async function computeSha256(content: string): Promise<string> {
  return createHash('sha256').update(content).digest('hex');
}

export async function snapshotFile(projectRoot: string, relativePath: string): Promise<FileSnapshot> {
  const canonical = await assertWithinRepository(projectRoot, relativePath);
  const fullPath = resolve(projectRoot, relativePath);
  const linkStat = await lstat(fullPath).catch(() => null);
  if (!linkStat) {
    const identity = computeFileIdentity(canonical);
    return { path: relativePath, realPath: canonical, exists: false, content: null, sha256: null, isSymlink: false, fileIdentity: identity };
  }
  const isSymlink = linkStat.isSymbolicLink();
  const targetStat = await stat(fullPath).catch(() => null);
  if (!targetStat || !targetStat.isFile()) {
    const identity = computeFileIdentity(canonical, targetStat?.dev, targetStat?.ino);
    return { path: relativePath, realPath: canonical, exists: targetStat !== null, content: null, sha256: null, isSymlink, fileIdentity: identity };
  }
  const content = await readFile(canonical, 'utf8');
  const sha256 = await computeSha256(content);
  const identity = computeFileIdentity(canonical, targetStat.dev, targetStat.ino);
  return { path: relativePath, realPath: canonical, exists: true, content, sha256, isSymlink, fileIdentity: identity };
}

export async function snapshotFiles(projectRoot: string, relativePaths: readonly string[]): Promise<FileSnapshot[]> {
  const results: FileSnapshot[] = [];
  for (const relativePath of relativePaths) {
    results.push(await snapshotFile(projectRoot, relativePath));
  }
  return results;
}
