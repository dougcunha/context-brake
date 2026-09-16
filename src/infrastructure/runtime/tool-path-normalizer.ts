import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { RuntimeEvent } from '../../core/contracts/runtime.js';

export async function normalizeEventToolPaths(event: RuntimeEvent | null, projectRoot: string): Promise<RuntimeEvent | null> {
  if (event === null || !('tool' in event) || event.tool.paths.length === 0) return event;
  const paths = await Promise.all(event.tool.paths.map((path) => normalizeToolPath(projectRoot, path)));
  return { ...event, tool: { ...event.tool, paths } };
}

export async function normalizeToolPath(projectRoot: string, toolPath: string): Promise<string> {
  const absolute = isAbsolute(toolPath) ? toolPath : resolve(projectRoot, toolPath);
  const canonicalRoot = await canonicalPath(projectRoot);
  const canonicalParent = await canonicalPath(dirname(absolute));
  return relative(canonicalRoot, join(canonicalParent, basename(absolute))).replace(/\\/g, '/');
}
async function canonicalPath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}
