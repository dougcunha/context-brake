import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deleteFileIfExists } from '../../src/infrastructure/storage/atomic-writer.js';
import { arePathsEqual, assertWithinRepository, computeFileIdentity, RepositoryBoundaryError } from '../../src/infrastructure/storage/path-boundary.js';

describe('path boundary and repository confinement', () => {
  it('identifies paths inside repository and rejects paths outside', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-boundary-'));
    try {
      const canonical = await assertWithinRepository(dir, 'sub/file.txt');
      expect(canonical).toContain('sub/file.txt');
      await expect(assertWithinRepository(dir, '../../outside.txt')).rejects.toThrow(RepositoryBoundaryError);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('compares paths taking platform into account', () => {
    expect(arePathsEqual('/a/b', '/a/b')).toBe(true);
    expect(arePathsEqual('/a/b', '/a/c')).toBe(false);
  });
});

describe('linked root repository confinement', () => {
  it('accepts missing path under linked root and rejects outside paths or links', async () => {
    const parentDir = await mkdtemp(join(tmpdir(), 'cb-linked-root-'));
    try {
      const realDir = join(parentDir, 'real-root');
      const linkDir = join(parentDir, 'link-root');
      const outsideDir = join(parentDir, 'outside-dir');
      await mkdir(realDir, { recursive: true });
      await mkdir(outsideDir, { recursive: true });
      await symlink(realDir, linkDir, process.platform === 'win32' ? 'junction' : 'dir');
      const outsideLink = join(realDir, 'outside-link');
      await symlink(outsideDir, outsideLink, process.platform === 'win32' ? 'junction' : 'dir');
      const canonical = await assertWithinRepository(linkDir, 'missing-config.json');
      expect(canonical).toContain('missing-config.json');
      await expect(assertWithinRepository(linkDir, '../../outside.txt')).rejects.toThrow(RepositoryBoundaryError);
      await expect(assertWithinRepository(linkDir, 'outside-link/missing.txt')).rejects.toThrow(RepositoryBoundaryError);
    } finally {
      await rm(parentDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('file identity and atomic file deletion', () => {
  it('computes file identity from canonical path or dev/ino', () => {
    const id1 = computeFileIdentity('/a/b');
    expect(id1).toBeDefined();
    const id2 = computeFileIdentity('/a/b', 123, 456);
    expect(id2).toBeDefined();
  });

  it('deletes file if exists and returns false if absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-delete-'));
    try {
      const file = join(dir, 'test.txt');
      expect(await deleteFileIfExists(file)).toBe(false);
      await writeFile(file, 'hi', 'utf8');
      expect(await deleteFileIfExists(file)).toBe(true);
      expect(await deleteFileIfExists(file)).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
