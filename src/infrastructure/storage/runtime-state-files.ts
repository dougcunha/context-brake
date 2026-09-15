import { readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

export const RUNTIME_STATE_RELATIVE_DIR = '.context-brake/runtime' as const;

type ReaddirWithTypes = (
  path: string,
  options: { recursive: true; withFileTypes: true },
) => Promise<Array<{ isFile: () => boolean; name: string; path?: string | undefined; parentPath?: string | undefined }>>;

export async function listRuntimeStateFiles(root: string, readdirFn: ReaddirWithTypes = readdir): Promise<string[]> {
  const runtimeDir = resolve(root, RUNTIME_STATE_RELATIVE_DIR);
  try {
    const entries = await readdirFn(runtimeDir, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const parentDir = entry.parentPath ?? entry.path ?? runtimeDir;
        return join(RUNTIME_STATE_RELATIVE_DIR, relative(runtimeDir, parentDir), entry.name);
      })
      .map((p) => p.replace(/\\/g, '/'))
      .sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}
