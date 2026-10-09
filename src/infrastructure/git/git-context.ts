import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ProcessRunner } from '../../core/contracts/processes.js';

const GIT_TIMEOUT_MILLISECONDS = 5000;
const GIT_ENTRY = '.git';

async function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}

export async function isInsideGitWorkingTree(root: string): Promise<boolean> {
  let current = root;
  while (!(await exists(join(current, GIT_ENTRY)))) {
    const parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
  return true;
}

export async function trackedOwnedFiles(runner: ProcessRunner | undefined, root: string, paths: readonly string[]): Promise<string[]> {
  if (runner === undefined || paths.length === 0) return [];
  const result = await runner.run({ executable: 'git', args: ['-C', root, 'ls-files', '-z', '--', ...paths], timeoutMilliseconds: GIT_TIMEOUT_MILLISECONDS });
  if (result.status !== 'completed' || result.exitCode !== 0) return [];
  return result.stdout.split('\0').filter((path) => path !== '');
}
