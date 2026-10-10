import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveChangeTarget } from '../../src/infrastructure/harnesses/common/change-target.js';
import { normalizeSeparators, RepositoryBoundaryError } from '../../src/infrastructure/storage/path-boundary.js';

const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir';

let tempDir: string;
beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-target-')); });
afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('canonical resolution through a linked directory (T10.1, T10.3)', () => {
  it.each([
    ['an existing file', 'existing.json'],
    ['nested missing segments', 'sub/deep/nested.mjs'],
  ])('resolves %s under a link to the canonical target', async (_label, relative) => {
    const realDir = join(tempDir, 'real-config');
    await mkdir(realDir, { recursive: true });
    await writeFile(join(realDir, 'existing.json'), '{}', 'utf8');
    await symlink(realDir, join(tempDir, 'link-config'), LINK_TYPE);
    const result = await resolveChangeTarget(tempDir, `link-config/${relative}`);
    expect(result).toBe(`${normalizeSeparators(await realpath(realDir))}/${relative}`);
  });
});

describe('repository boundary for change targets (T10.3)', () => {
  it('rejects out-of-root paths and outside-pointing links', async () => {
    await expect(resolveChangeTarget(tempDir, '../../outside.txt')).rejects.toThrow(RepositoryBoundaryError);
    const outsideDir = await mkdtemp(join(tmpdir(), 'cb-outside-'));
    try {
      await symlink(outsideDir, join(tempDir, 'outside-link'), LINK_TYPE);
      await expect(resolveChangeTarget(tempDir, 'outside-link/file.txt')).rejects.toThrow(RepositoryBoundaryError);
    } finally {
      await rm(outsideDir, { recursive: true, force: true });
    }
  });
});
