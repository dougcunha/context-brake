import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveChangeTarget } from '../../src/infrastructure/harnesses/common/change-target.js';
import { normalizeSeparators, RepositoryBoundaryError } from '../../src/infrastructure/storage/path-boundary.js';

describe('canonical resolution for existing and missing paths (T10.1, T10.3)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-target-a-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }).catch(() => {}); });

  it('resolves existing file to its canonical path', async () => {
    const filePath = join(tempDir, 'existing.txt');
    await writeFile(filePath, 'hello', 'utf8');
    const result = await resolveChangeTarget(tempDir, 'existing.txt');
    expect(result).toBe(normalizeSeparators(await realpath(filePath)));
  });

  it('canonicalizes nearest existing ancestor for missing file under link', async () => {
    const realDir = join(tempDir, 'real-config');
    const linkDir = join(tempDir, 'link-config');
    await mkdir(realDir, { recursive: true });
    await symlink(realDir, linkDir, process.platform === 'win32' ? 'junction' : 'dir');
    const result = await resolveChangeTarget(tempDir, 'link-config/missing.json');
    const realCanonical = normalizeSeparators(await realpath(realDir));
    expect(result).toBe(`${realCanonical}/missing.json`);
  });
});

describe('canonical resolution for nested segments and boundaries (T10.3)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-target-b-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }).catch(() => {}); });

  it('canonicalizes nearest existing ancestor with nested missing segments', async () => {
    const realDir = join(tempDir, 'real-root');
    const linkDir = join(tempDir, 'link-root');
    await mkdir(realDir, { recursive: true });
    await symlink(realDir, linkDir, process.platform === 'win32' ? 'junction' : 'dir');
    const result = await resolveChangeTarget(tempDir, 'link-root/sub/deep/nested.mjs');
    const realCanonical = normalizeSeparators(await realpath(realDir));
    expect(result).toBe(`${realCanonical}/sub/deep/nested.mjs`);
  });

  it('rejects out-of-root paths and outside-pointing links', async () => {
    await expect(resolveChangeTarget(tempDir, '../../outside.txt')).rejects.toThrow(RepositoryBoundaryError);
    const outsideDir = await mkdtemp(join(tmpdir(), 'cb-outside-'));
    try {
      const linkToOutside = join(tempDir, 'outside-link');
      await symlink(outsideDir, linkToOutside, process.platform === 'win32' ? 'junction' : 'dir');
      await expect(resolveChangeTarget(tempDir, 'outside-link/file.txt')).rejects.toThrow(RepositoryBoundaryError);
    } finally {
      await rm(outsideDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
