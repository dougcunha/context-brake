import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listRuntimeStateFiles } from '../../src/infrastructure/storage/runtime-state-files.js';

describe('listRuntimeStateFiles (FR-09, TC-05)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-runtime-files-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('returns an empty array when the runtime directory does not exist', async () => {
    await expect(listRuntimeStateFiles(root)).resolves.toEqual([]);
  });

  it('lists nested files as POSIX-relative paths', async () => {
    await mkdir(join(root, '.context-brake/runtime/sessions'), { recursive: true });
    await writeFile(join(root, '.context-brake/runtime/lock.json'), '{}', 'utf8');
    await writeFile(join(root, '.context-brake/runtime/sessions/s1.json'), '{}', 'utf8');
    const files = await listRuntimeStateFiles(root);
    expect(files).toEqual(['.context-brake/runtime/lock.json', '.context-brake/runtime/sessions/s1.json']);
  });

  it('falls back to entry.path on Node versions where parentPath is undefined', async () => {
    const runtimeDir = join(root, '.context-brake/runtime');
    const mockDirent = {
      isFile: () => true,
      name: 'file.json',
      path: join(runtimeDir, 'sub'),
      parentPath: undefined,
    };
    const files = await listRuntimeStateFiles(root, async () => [mockDirent]);
    expect(files).toEqual(['.context-brake/runtime/sub/file.json']);
  });
});
