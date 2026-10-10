import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteFileIfExists } from '../../src/infrastructure/storage/atomic-writer.js';
import { arePathsEqual, assertWithinRepository, computeFileIdentity, normalizeSeparators, RepositoryBoundaryError } from '../../src/infrastructure/storage/path-boundary.js';

const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir';

let parent: string;
beforeAll(async () => {
  parent = await realpath(await mkdtemp(join(tmpdir(), 'cb-boundary-')));
  await mkdir(join(parent, 'real-root'), { recursive: true });
  await mkdir(join(parent, 'outside-dir'), { recursive: true });
  await symlink(join(parent, 'real-root'), join(parent, 'link-root'), LINK_TYPE);
  await symlink(join(parent, 'outside-dir'), join(parent, 'real-root/outside-link'), LINK_TYPE);
});
afterAll(async () => { await rm(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('repository confinement refuses every escape', () => {
  it.each([
    { label: 'a parent-directory escape', root: 'real-root', target: () => '../../outside.txt' },
    { label: 'an absolute path outside the root', root: 'real-root', target: () => join(tmpdir(), 'cb-abs-outside.txt') },
    { label: 'a sibling directory sharing the root name prefix', root: 'real-root', target: () => '../real-root-evil/file.txt' },
    { label: 'a link inside the root pointing outside', root: 'real-root', target: () => 'outside-link/missing.txt' },
    { label: 'a parent-directory escape from a linked root', root: 'link-root', target: () => '../../outside.txt' },
    { label: 'a link pointing outside, reached through a linked root', root: 'link-root', target: () => 'outside-link/missing.txt' },
  ])('rejects $label', async ({ root, target }) => {
    await expect(assertWithinRepository(join(parent, root), target())).rejects.toThrow(RepositoryBoundaryError);
  });

  it('accepts a missing path under a linked root and returns its canonical path', async () => {
    const canonical = await assertWithinRepository(join(parent, 'link-root'), 'sub/missing-config.json');
    expect(canonical).toBe(`${normalizeSeparators(join(parent, 'real-root'))}/sub/missing-config.json`);
  });
});

describe('path comparison and file identity', () => {
  it('compares paths taking platform into account', () => {
    expect(arePathsEqual('/a/b', '/a/b')).toBe(true);
    expect(arePathsEqual('/a/b', '/a/c')).toBe(false);
  });

  it('identifies a file by its lowercased canonical path on Windows and by device and inode elsewhere', () => {
    const windows = process.platform === 'win32';
    expect(computeFileIdentity('C:/Repo/A.json')).toBe(windows ? 'c:/repo/a.json' : 'C:/Repo/A.json');
    expect(computeFileIdentity('C:/Repo/A.json', 7, 42)).toBe(windows ? 'c:/repo/a.json' : '7:42');
  });
});

describe('atomic file deletion', () => {
  it('deletes file if exists and returns false if absent', async () => {
    const file = join(parent, 'real-root/test.txt');
    expect(await deleteFileIfExists(file)).toBe(false);
    await writeFile(file, 'hi', 'utf8');
    expect(await deleteFileIfExists(file)).toBe(true);
    expect(await deleteFileIfExists(file)).toBe(false);
  });
});
