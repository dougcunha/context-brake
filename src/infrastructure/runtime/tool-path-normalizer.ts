import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

export async function normalizeToolPath(projectRoot: string, toolPath: string): Promise<string> {
  const absolute = isAbsolute(toolPath) ? toolPath : resolve(projectRoot, toolPath);
  const canonicalRoot = await canonicalPath(projectRoot);
  const canonicalParent = await canonicalPath(dirname(absolute));
  return relative(canonicalRoot, join(canonicalParent, basename(absolute))).replace(/\\/g, '/');
}
async function canonicalPath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}
